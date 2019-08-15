## 💪️ Part 2 of 6: Adding SSR to the App

Angular CLI is amazing! In particular, its schematics feature allows us to add new capabilities to the app using a simple command. In this case, we'll run the following command to add SSR capabilities.

```
ng add @nguniversal/express-engine --clientProject ssr-with-i18n
```

Running this command updated and added a few files.

> Image showing new files

If we look at the `package.json` file, we'll see that now we have a few new scripts that we can execute. The two most important are: (1) `build:ssr` and (2) `serve:ssr`. Let's run these commands and see what happens.

Both commands run successfully. However, when we load the website in the browser, we get an error.

```
TypeError: Cannot read property 'match' of undefined
    at new I18nModule (C:\Source\Random\ssr-with-i18n\dist\server\main.js:113153:35)
```

A little bit of investigation reveals that the failing code is:

```ts
browserLang.match(/en|ru/)
```

The `browserLang` variable is `undefined`, which means that the following line of code didn't work:

```ts
const browserLang = translateCacheService.getCachedLanguage() || translate.getBrowserLang();
```

This happens because we're trying to access browser-specific APIs during the server-side rendering. Even the name of the function - `getBrowserLang()` suggests that this function won't work on the server. We'll come back to this issue, but for the time being, let's patch it by hard-coding the value of the `browserLang` variable:

```ts
const browserLang = 'en';
```

Build and serve the application again. This time there is no error. In fact, if we look at the network tab of the Developer Tools we'll see that SSR worked! However, the translations didn't come through.

> Screenshot showing SSR partially working

Let's see why this is happening. Notice the factory function used in the `TranslateModule` to load translations: `translateLoaderFactory`. This function makes use of the `HttpClient` and knows how to load the JSON files containing translations from the browser. However, the factory function is not smart enough to know how to load these files while in the server environment.

This brings us to the two issues we need to solve:

PROBLEM 1. Being able to determine the correct language to load in both the client and the server environments (instead of hard-coding the value to `en`).
PROBLEM 2. Based on the environment, use the appropriate mechanism to load the JSON file containing translations.

Now that the issues are identified, let's examine different ways to solve these issues.

## 🤔 Evaluating Existing Options

There are a few ways that we can make everything work. There is a closed issue in the ngx-translate repository related to enabling SSR - [issue #754](https://github.com/ngx-translate/core/issues/754). A few solutions to PROBLEMS 1 and 2 can be found there.

### Existing Solution 1. Fix via HttpInterceptor

One of the latest comments on issue #754 suggests using a solution found in the article "[Angular Universal: How to add multi language support?](https://itnext.io/angular-universal-how-to-add-multi-language-support-68d83f6dfc4d)" to address the PROBLEM 2. Unfortunately, PROBLEM 1 is not addressed in the article. The author suggests a fix using the `HttpInterceptor`, which patches the requests to retrieve the JSON files while on the server.

Even though the solution works, it feels a bit awkward to me to create an interceptor that will patch the path of the request. In addition, why should we be making an extra request (even though it's local) when we have access to the files through the file system? Let's see what other options are available.

### Existing Solution 2. Fix via Importing JSON Files Directly

A few recent comments on the same [issue #754](https://github.com/ngx-translate/core/issues/754) suggest importing the contents of JSON files straight into the file which defines our module. Then we can check which environment we're running in and either use the default `TranslateHttpLoader` or a custom one, which uses the imported JSON. This approach suggests a way to handle PROBLEM 2 by checking the environment where the code is running: `if (isPlatformBrowser(platform))`. We'll use a similar platform check later in the article.

```ts
import { PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from '@angular/common';
import * as translationEn from './assets/i18n/en.json';
import * as translationEs from './assets/i18n/es.json';

const TRANSLATIONS = {
  en: translationEn,
  es: translationEs,
};

export class JSONModuleLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return of(TRANSLATIONS[lang]);
  }
}

export function translateLoaderFactory(http: HttpClient, platform: any) {
  if (isPlatformBrowser(platform)) {
    return new TranslateHttpLoader(http);
  } else {
    return new JSONModuleLoader();
  }
}

// module imports:
TranslateModule.forRoot({
  loader: {
    provide: TranslateLoader,
    useFactory: translateLoaderFactory,
    deps: [HttpClient, PLATFORM_ID]
  }
})
```

**Please don't do this!** By importing JSON files like shown above, they will end up in the browser bundle. The whole purpose of using HttpLoader is that it will load the required language file **on demand** making the browser bundle smaller.

With this method, the translations for all the languages will be bundled together with the run-time JavaScript compromising performance.

Although both existing solutions provide a fix for PROBLEM 2, they have their shortcomings. One results in unnecessary requests being made and another one compromises performance. Neither of them provides a solution for PROBLEM 1.

## 🔋 A Better Way - Prerequisites
In the upcoming sections I'll provide two separate solutions to the identified PROBLEMS. Both of the solutions will require the following prerequisites.

Prerequisite 1. We need to install and use a dependency called [cookie-parser](https://www.npmjs.com/package/cookie-parser).
Prerequisite 2. Understand the Angular REQUEST injection token

### Prerequisite 1. Why Do We Need cookie-parser?
The *ngx-translate-cache* library is in charge of creating a cookie in the client when a user selects the language. By default (although it can be configured) the cookie is named `lang`. In the upcoming solutions we'll need a way to access this cookie on the server. By default we can access the information we need from the `req.headers.cookie` object in any of the Express request handlers. The value would look something like this:

```
lang=en; other-cookie=other-value
```

This property has all the information we need, but we need to parse the `lang` out. Although it's simple enough, there is no need to reinvent the wheel since `cookie-parser` is an Express middleware that does exactly what we need.

Install the required dependencies.

```
npm install cookie-parser
npm install @types/cookie-parser -D
```

Update the `server.ts` file to use the installed `cookie-parser`.

```ts
import * as cookieParser from 'cookie-parser';
app.use(cookieParser());
```

Under the hood, the `cookie-parser` will parse the Cookies and store them as a dictionary object under `req.cookies`.

```json
{
  "lang": "en",
  "other-cookie": "other-value"
}
```

### Prerequisite 2. The Angular REQUEST Injection Token
Now that we have a convenient way of accessing Cookies from the request object, we need to have access to the `req` object in the context of the Angular application. This can easily be done using the `REQUEST` injection token.

```ts
import { REQUEST } from '@nguniversal/express-engine/tokens';
import { Request } from 'express';

export class AnyModule {
  constructor(@Inject(REQUEST) private req: Request) {
    console.log(req.cookies.lang); // 'en' | 'ru'
  }
}
```

Here's the obvious fact: The `REQUEST` injection token is available under `@nguniversal/express-engine/tokens`. Here is a not so obvious fact: the type for the `req` object is the `Request` provided by type definitions of the `express` library.

This is important and might trip us over. If this import is forgotten, the typescript will assume a different `Request` type from the Fetch API that's available under `lib.dom.d.ts`. As a result, TypeScript will not have knowledge of `req.cookies` object and will underline it with red.


## Now We Are Ready for the Solutions
Please make a mental snapshot of the PART 2 Checkpoint below. We will use this code as a starting point for the next two parts of this series where we'll explore how to fix the two PROBLEMS outlined above.

### PART 2 Checkpoint
*** The code up to this point is available [here](https://github.com/DmitryEfimenko/ssr-with-i18n/tree/step-2).

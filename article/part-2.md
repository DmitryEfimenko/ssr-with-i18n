# Lost in translation... strings - Part 2: i18n for Server-Side Rendered Angular applications

## Previously
TODO

## Adding SSR to the app

Angular CLI is amazing! In particular, its schematics feature allows us to add new capabilities to the app using a simple command. In this case, we'll run the following command to add SSR capabilities:

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

The `browserLang` variable is undefined, which means that the following line of code didn't work:

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

1. Being able to determine the correct language to load in both the client and the server environments (instead of hard-coding the value to `en`).

2. Based on the environment, use the appropriate mechanism to load the JSON file containing translations.

Now that the issues are identified, let's examine different ways to solve these issues.

*** The code up to this point is available [here](https://medium.com/r/?url=https%3A%2F%2Fgithub.com%2FDmitryEfimenko%2Fssr-with-i18n%2Ftree%2Fstep-3).

## Evaluating existing options

There are a few ways that we can make everything work. There is a closed issue in the ngx-translate repository related to enabling SSR - [issue #754](https://medium.com/r/?url=https%3A%2F%2Fgithub.com%2Fngx-translate%2Fcore%2Fissues%2F754). A few solutions to the issue can be found there.

### Fix via HttpInterceptor

One of the latest comments to the issue suggests using a solution found in the article "[Angular Universal: How to add multi language support?](https://medium.com/r/?url=https%3A%2F%2Fitnext.io%2Fangular-universal-how-to-add-multi-language-support-68d83f6dfc4d)" In the article, the author suggests fixing the issue using the `HttpInterceptor`, which patches the requests to the JSON files while on the server.

Even though the solution works, it feels a bit awkward to me to create an interceptor that will patch the path of the request. In addition, why should we be making an extra request (even though it's local) when we have access to the files through the file system? Let's see what other options are available.

### Fix via importing JSON files directly

A few recent comments on the same [issue #754](https://medium.com/r/?url=https%3A%2F%2Fgithub.com%2Fngx-translate%2Fcore%2Fissues%2F754) suggest importing the contents of JSON files straight into the file which defines our module. Then we can check which environment we're running in and either use the default `TranslateHttpLoader` or a custom one, which uses the imported JSON.

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

**Please don't do this!** By importing JSON files like shown above, they will end up in the browser bundle. The whole purpose of using HttpLoader is that it will load the required language file **on demand** making the JavaScript bundle smaller.

With this method, the translations for all the languages will be bundled together with the run-time JavaScript compromising performance.

## A better way - prerequisites
TODO: 

TODO: about injecting REQUEST into Angular, why it needs to be @Optional

TODO: why we need cookie-parser

```
npm install cookie-parser
npm install @types/cookie-parser -D
```

Update the `server.ts` file to use the installed `cookie-parser`. This will parse Cookies passed in the request object and store them as a dictionary object under `req.cookies`.

```ts
import * as cookieParser from 'cookie-parser';
app.use(cookieParser());
```

TODO: transition to the part 3.

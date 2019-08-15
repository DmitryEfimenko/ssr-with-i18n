## 👌 Part 3 of 6: Solution 1 - Fix via Providing a Separate I18nModule for the Server

Currently, our application looks like this:

> Image

The diagram above shows the path of code execution when the code runs in the browser (green) and when it runs in the server (blue). Notice that in the client-side path, the file that bootstraps the whole application (`main.ts`) imports the `AppModule` directly. On the server-side path, the main file imports a separate module, the `AppServerModule`, which in turn imports the `AppModule`. Also, notice that the `I18nModule` is a dependency of `AppModule`, which means that the code of `I18nModule` will be executed in both the client and in the server.

In the solution below we'll make the browser side look more like the server side. We'll introduce a new module - the `AppBrowserModule`. That will be the module to be bootstrapped. We'll also rename the I18nModule to `I18nBrowserModule` and move it into the imports of the `AppBrowserModule`. Finally, we'll introduce a new module, the `I18nServerModule`, that will use file system access to load JSON files. This module will be imported inside of the `AppServerModule`. See the resulting structure below:

> Image

Below is the code of the new I18nServerModule.

```ts
import { Inject, NgModule } from '@angular/core';
import { REQUEST } from '@nguniversal/express-engine/tokens';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { Request } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Observable, of } from 'rxjs';

@NgModule({
  imports: [
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: translateFSLoaderFactory
      }
    })
  ]
})
export class I18nServerModule {
  constructor(translate: TranslateService, @Inject(REQUEST) req: Request) {
    translate.addLangs(['en', 'ru']);
    const language: 'en' | 'ru' = req.cookies.lang || 'en';
    translate.use(language.match(/en|ru/) ? language : 'en');
  }
}
```

```ts
export class TranslateFSLoader implements TranslateLoader {
  constructor(private prefix = 'i18n', private suffix = '.json') { }
  
  public getTranslation(lang: string): Observable<any> {
    const path = join(__dirname, '../browser/assets/', this.prefix, `${lang}${this.suffix}`);
    const data = JSON.parse(readFileSync(path, 'utf8'));
    return of(data);
  }
}

export function translateFSLoaderFactory() {
  return new TranslateFSLoader();
}
```

There are two main things happening in the code above.

First, we make use of the REQUEST injection token provided by Angular to get a hold of the full request object. We use the token to access the cookies object to find out what language the user selected in the browser. Knowing the language, we call the `use` method of the `TranslateService` class so that our website gets rendered in that language.

Second, the action above will trigger our custom loading mechanism defined in the `TranslateFsLoader` class. In the class we simply use standard node API to read files from the file system (fs).

## Solution 1 Summary

This solution completely separates the compilation path for the server from the compilation path for the browser. PROBLEM 1 is solved due to the `translate.getBrowserLang()` existing only in the `I18nBrowserModule`, which will never run in the server environment.

PROBLEM 2 is similarly solved by each I18n Module -- the Server and the Client modules -- using their own Translation Loader mechanism - the `TranslateFsLoader` and `TranslateHttpLoader` respectively.

I like this option because it comes with a clear separation between the code that runs on the server and the code that runs in the browser. Introducing the `AppBrowserModule` establishes the architecture for handling cases when the server- and client-side logic significantly differs. Perhaps this approach is best suited for larger applications.

However, there is one more approach to tackle this task. Keep reading!

*** The code up to this point is available [here](https://github.com/DmitryEfimenko/ssr-with-i18n/tree/step-3).

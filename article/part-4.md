# Lost in Translation... Strings
# Part 4: i18n for Server-Side Rendered Angular applications

## Previously
TODO

## A Better Solution

### Option 2. Provide everything in a single module

In contrast to the previous option, this option does not require the creation of new modules. Instead, all code will be placed inside of the `I18nModule`. This can be achieved using the `isPlatformBrowser` function provided by the Angular framework.

Let's come back to the step-3 checkpoint.

git checkout step-3

We'll reuse the `TranslateFSLoader` class we created in the previous step. However, we'll make the `I18nModule` aware of the platform it's running in and use the appropriate Loader depending on the environment.

Add the `TransferState` and the `PLATFORM_ID` to the deps of the `translateLoaderFactory`. This will allow us to change the factory implementation to be the following:

```ts
export function translateLoaderFactory(httpClient: HttpClient, transferState: TransferState, platform: any) {
  return isPlatformBrowser(platform)
    ? new TranslateBrowserLoader(transferState, httpClient)
    : new TranslateFSLoader(transferState);
}
```

Now, the factory function will use the appropriate Loader depending on the platform. Similar adjustments need to be done to the `constructor` of the `I18nModule`.

```ts
@NgModule({...})
export class I18nModule {
  constructor(
    translate: TranslateService,
    translateCacheService: TranslateCacheService,
    @Optional() @Inject(REQUEST) private req: Request,
    @Inject(PLATFORM_ID) private platform: any
  ) {
    if (isPlatformBrowser(this.platform)) {
      translateCacheService.init();
    }

    translate.addLangs(['en', 'ru']);

    const browserLang = isPlatformBrowser(this.platform)
      ? translateCacheService.getCachedLanguage() || translate.getBrowserLang() || 'en'
      : this.getLangFromServerSideCookie();

    translate.use(browserLang.match(/en|ru/) ? browserLang : 'en');
  }
  
  getLangFromServerSideCookie() {
    if (this.req) {
      return this.req.cookies.lang;
    }
  }
}
```

If we try to build the application now we'll get an error.

```
Module not found: Error: Can't resolve 'fs' in 'C:\ssr-with-i18n\src\app\i18n'
Module not found: Error: Can't resolve 'path' in 'C:\ssr-with-i18n\src\app\i18n'
```

That's because the `fs` and the `path` dependencies, which are strictly node dependencies, are now referenced in the file that's compiled for the browser environment.

We, as developers, know that these node dependencies won't be used because they are behind appropriate `if` statements, but the compiler does not know that.

There is an easy fix for this issue as well. We can let our compiler know not to include these dependencies in the browser environment using a new [browser](https://medium.com/r/?url=https%3A%2F%2Fgithub.com%2Fdefunctzombie%2Fpackage-browser-field-spec) field of the `package.json` file.

Add the following to the `package.json` file.

```json
"browser": {
  "fs": false,
  "path": false
}
```

Now, everything will compile and run exactly the same as with the previous solution.

I like this option because it's simpler from the perspective of the consumer application. There's no need to create additional modules.

*** The code up to this point is available [here](https://medium.com/r/?url=https%3A%2F%2Fgithub.com%2FDmitryEfimenko%2Fssr-with-i18n%2Ftree%2Fstep-6).

## 👌 Part 4 of 6: Solution 2 - Provide Everything in a Single Module

Now that we looked at Solution 1, let's examine another way. In contrast to Solution 1, this solution does not require the creation of new modules. Instead, all code will be placed inside of the `I18nModule`. This can be achieved using the `isPlatformBrowser` function provided by the Angular framework.

Let's come back to the [PART 2 Checkpoint](https://github.com/DmitryEfimenko/ssr-with-i18n/tree/step-2).

```
git checkout step-2
```

Now we'll make the `I18nModule` aware of the platform it's running in and use the appropriate Loader depending on the environment - either the `TranslateFsLoader` created in the previous Part or the `TranslateHttpLoader` provided by the *ngx-translate* library.

Add the `PLATFORM_ID` to the deps of the `translateLoaderFactory`. This will allow us to select the loader in the factory depending on the current platform.

```ts
export function translateLoaderFactory(httpClient: HttpClient, platform: any) {
  return isPlatformBrowser(platform)
    ? new TranslateHttpLoader(httpClient)
    : new TranslateFSLoader();
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
      : this.getLangFromServerSideCookie() || 'en';

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

That's because the `fs` and the `path` dependencies, which are strictly Node dependencies, are now referenced in the file that's compiled for the client-side environment.

We, as developers, know that these server-side dependencies won't be used because they are behind appropriate `if` statements, but the compiler does not know that.

There is an easy fix for this issue as well. We can let our compiler know not to include these dependencies in the client-side environment using a new [browser](https://github.com/defunctzombie/package-browser-field-spec) field of the `package.json` file.

Add the following to the `package.json` file.

```json
"browser": {
  "fs": false,
  "path": false
}
```

Now, everything will compile and run exactly the same as with the previous solution.

## Solution 2 Summary

Both PROBLEM 1 and PROBLEM 2 are solved by separating the browser-specific code from the server-specific code via an `if` statement that evaluates the current platform:
```
isPlatformBrowser(this.platform)
```

Now that there is only a single path of compilation for both platforms, `fs` and `path` dependencies that are strictly node dependencies cause a compilation-time error when the build process compiles a browser bundle. This is solved by specifying these dependencies in the `browser` field of the `package.json` file and setting their values to `false`.

I like this option because it's simpler from the perspective of the consumer application. There's no need to create additional modules.

*** The code up to this point is available [here](https://github.com/DmitryEfimenko/ssr-with-i18n/tree/step-4).

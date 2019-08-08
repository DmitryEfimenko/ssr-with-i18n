# Lost in Translation... Strings
# Part 5 of 6: i18n for Server-Side Rendered Angular Applications

## Previously
TODO

## Improve Performance with TransferState

If we run our app in its current state and take a look at the network tab of the Chrome Developer Tools, we'll see that after initial load, the app will make a request to load the JSON file for the currently selected language.

This does not make much sense since we've already loaded the appropriate language in the server. Angular SSR provides a tool to solve this issue

TODO: talk more about general TransferState

We need to pass this information down to the browser and make sure that we don't load that language via HTTP request if we got it from the server.

First, let's make appropriate changes to the `I18nServerModule`. The snippet below shows the new code.

```ts
// ADDED needed imports from @angular
import { makeStateKey, TransferState } from '@angular/platform-browser';
import { ServerTransferStateModule } from '@angular/platform-server';
@NgModule({
  imports: [
    ServerTransferStateModule, // ADDED
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: translateFSLoaderFactory,
        deps: [TransferState] // ADDED: dependency for the factory func
      }
    })
  ]
})
export class I18nServerModule {
  // code unchanged
}
```

```ts
export class TranslateFSLoader implements TranslateLoader {
  constructor(
    // ADDED: inject the transferState service
    private transferState: TransferState,
    private prefix = 'i18n',
    private suffix = '.json'
  ) { }

  public getTranslation(lang: string): Observable<any> {
    const path = join(__dirname, '../browser/assets/', this.prefix, `${lang}${this.suffix}`);
    const data = JSON.parse(readFileSync(path, 'utf8'));
    // ADDED: store the translations in the transfer state:
    const key = makeStateKey<any>('transfer-translate-' + lang);
    this.transferState.set(key, data);
    return of(data);
  }
}

// ADDED: parameter to the factory function
export function translateFSLoaderFactory(transferState: TransferState) {
  return new TranslateFSLoader(transferState);
}
```

TODO: create animation showing that server-sde Transfer State works

Second, we need to update the `I18nBrowserModule`.

Currently, our loader factory function simply returns the `TranslateHttpLoader`. We'll have to create a custom loader that will also be capable of handling the transfer state.

let's add the custom loader to the new file. The new loader would look like the one below.

```ts
export class TranslateBrowserLoader implements TranslateLoader {
  constructor(
    private transferState: TransferState,
    private http: HttpClient,
    private prefix: string = 'i18n',
    private suffix: string = '.json',
  ) { }
  
  public getTranslation(lang: string): Observable<any> {
    const key = makeStateKey<any>('transfer-translate-' + lang);
    const data = this.transferState.get(key, null);

    // First we are looking for the translations in transfer-state, if none found, http load as fallback
    return data
      ? of(data)
      : new TranslateHttpLoader(this.http, this.prefix, this.suffix).getTranslation(lang);
  }
}
```

Of course, appropriate changes would have to be done throughout the `I18nBrowserModule` to make use of this new loader.

Now, if we run the application we'll see that there is no unneeded request to the JSON file for the currently selected language in the network tab.

TODO: show animation showing that there is no initial request to a json file.


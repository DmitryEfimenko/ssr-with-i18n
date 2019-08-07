# Lost in Translation... Strings
# Part 1 of 6: i18n for Angular Applications

> Image

## The Background on Being Lost

So, I'm a married. While I love my wife and love being married, marriage can be difficult. Communication can be difficult. Not to mention the added layer of English being my second language and my wife's first language. 

The last couple of months I have been working on a project at work, that like oh-so-many projects, involves translation strings. I kept pushing what I though was the finalized version of the project to production only to find out that the translation strings from the translation team were holding the project back. I then did a deep dive into i18n for Angular applications. 

What does i18n stand for and why is there an "18" in the middle? Even as a front-end engineer I had no idea until I looked it up of course. It's the number of letters between "i" and "n" in the word "internationalization." So, i18n is internationalization. Pretty neat. One of the [definitions](https://medium.com/r/?url=https%3A%2F%2Fwww.w3.org%2FInternational%2Fquestions%2Fqa-i18n) of i18n is:

> The design and development of a product, application or document content that **enables** easy localization for target audiences that vary in culture, region, or language.

As I rearched more and more about i18n, or internationalization, I realized that this concept hit home, pun intended, in more of a direct way that I thought. So many of the little bickering disagreements that me and my wife get into have so much to do not only with both of our words getting lost in translation, but how we are translating each other's words back to ourselves internally. i18n deals with just that and acts as a marriage counselor or mediator in a way for translation strings themselves.

By following the link above, we can see that there are multiple areas of development. The one we'll concentrate on in this article is:

> Separating localizable elements from source code or content, such that localized alternatives can be loaded or selected based on the user's international preferences as needed.

In essence, whatever should be displayed in different languages needs to be separated out from the meat of the code to enable its maintainability.

We will explore how to:

1. Implement our translation strings in a maintainable manner
2. Enable the application to load only necessary resources
3. Allow browser memorization of the selected language
4. Enable Server-Side Rendering (SSR)
5. Manage issues encountered during enabling SSR in the Angular application (which makes use of i18n)

In the first part of this article, we will follow simple instructions for setting up an Angular application and adding i18n capabilities to it. Beginner-level developers may want to take a deep dive into the sections that follow. More advanced developers may glance at the code in the following sections and proceed to the "Adding SSR to the app" section to find out what obstacles adding SSR will create and how to solve them.

## Example setup

For the purposes of this article, we'll work with a bare-bones Angular application generated with [AngularCLI](https://medium.com/r/?url=https%3A%2F%2Fcli.angular.io%2F). To follow along with the article, we will generate an app using the command (assuming the Angular CLI installed globally):

```
ng new ssr-with-i18n
```

For the sake of the example let's add a couple of components:
```
ng g c comp-a
ng g c comp-b
```

Now we will replace the contents of app.component.html with these two components:

```html
<h1>Welcome to {{ title }}!</h1>
<app-comp-a></app-comp-a>
<app-comp-b></app-comp-b>
```

*** The code up to this point is available [here](https://medium.com/r/?url=https%3A%2F%2Fgithub.com%2FDmitryEfimenko%2Fssr-with-i18n%2Ftree%2Fstep-1).

## Adding i18n

As with most things in coding, there are many ways to skin a cat. In this article, we'll use a popular library: [ngx-translate](https://medium.com/r/?url=https%3A%2F%2Fgithub.com%2Fngx-translate%2Fcore). Originally, I wanted to use the framework-independent library [i18next](https://medium.com/r/?url=https%3A%2F%2Fwww.i18next.com%2F) with an Angular wrapper: [angular-i18next](https://medium.com/r/?url=https%3A%2F%2Fgithub.com%2FRomanchuk%2Fangular-i18next). However, there is currently a [big limitation](https://medium.com/r/?url=https%3A%2F%2Fgithub.com%2FRomanchuk%2Fangular-i18next%2Fpull%2F11%23issuecomment-364725022) with angular-i18next: it's not capable of switching language on the fly, which is a show-stopper for me.

Using ngx-translate will allow us to store our strings in separate JSON files (a file per language) where each string will be represented by a key-value pair. The key is a string identifier and the value is the translation of the string.

1. Install dependencies

In addition to the core library we'll install the http-loader library which will enable loading translations on-demand:

```
npm install @ngx-translate/core @ngx-translate/http-loader --save
```

2. Add the code

The directions for the ngx-translate package suggest adding relevant code directly to the AppModule. However, I think we can do better. Let's create a separate module that will encapsulate i18n related logic:

```
ng g m i18n --module app
```

This will add a new file: `/i18n/i18n.module.ts` and reference it in the `app.module.ts`.

Modify the `i18n.module.ts` file according to the [documentation](https://medium.com/r/?url=https%3A%2F%2Fgithub.com%2Fngx-translate%2Fcore%23configuration). The full file code is below:

```ts
import { NgModule } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

@NgModule({
  imports: [
    HttpClientModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: translateLoaderFactory,
        deps: [HttpClient]
      }
    }),
  ],
  exports: [TranslateModule]
})
export class I18nModule {
  constructor(translate: TranslateService) {
    translate.addLangs(['en', 'ru']);
    const browserLang = translate.getBrowserLang();
    translate.use(browserLang.match(/en|ru/) ? browserLang : 'en');
  }
}

export function translateLoaderFactory(httpClient: HttpClient) {
  return new TranslateHttpLoader(httpClient);
}
```

Nothing fancy is going on. We just added the `TranslateModule` and configured it to use the `HttpClient` to load translations. We exported `TranslateModule` as well to make the pipe `transform` available in the `AppModule`. In the constructor, we specified available languages and used a built-in function to get and use the browser's default language. By default, the `TranslateHttpLoader` will load translations from the `/assets/i18n/` folder, so let's add a couple of files there:

**/assets/i18n/en.json**
```json
{
  "compA": "Component A works",
  "compB": "Component B works"
}
```
/assets/i18n/ru.json
```json
{
  "compA": "Компонент А работает",
  "compB": "Компонент Б работает"
}
```

With this configuration, we should be able to update our component templates to use the translation strings instead of hard-coded text:

```html
// comp-a.component.html
<p>{{'compA' | translate}}</p>

// comp-b.component.html
<p>{{'compB' | translate}}</p>
```

Run the application and notice that it's using the translations from the `en.json` file. Let's add a component that will let us switch between the two languages:

```
ng g c select-language --inlineStyle --inlineTemplate
```

Update the contents of the select-language.component.ts file:

```ts
import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-select-language',
  template: `
    <select #langSelect (change)="translate.use(langSelect.value)">
      <option
        *ngFor="let lang of translate.getLangs()"
        [value]="lang"
        [attr.selected]="lang === translate.currentLang ? '' : null"
      >{{lang}}</option>
    </select>
  `,
})
export class SelectLanguageComponent {
  constructor(public translate: TranslateService) { }
}
```

The ngx-translate library allows us to switch languages via a simple `translate.use()` API call. It also allows us to determine the currently selected language by querying the `translate.currentLang` property.

Insert the new component in the `app.component.html` file after the `h1` tag:

```html
<h1>Welcome to {{ title }}!</h1>
<app-select-language></app-select-language>
<app-comp-a></app-comp-a>
<app-comp-b></app-comp-b>
```

Run the application and see that the language can now be switched on the fly. Selecting a different language will request the appropriate `.json` file.

> Animation showing things working

Now, if we select the language `ru` and refresh the browser, we'll see that the page loaded with the language `en` selected. The browser does not have a mechanism for remembering the selected language. Let's fix that.

## Memorizing the selected language

The Angular community has made many [plugins](https://medium.com/r/?url=https%3A%2F%2Fgithub.com%2Fngx-translate%2Fcore%23plugins) enhancing the functionality of the ngx-translate package. One of them is exactly what we need - [ngx-translate-cache](https://medium.com/r/?url=https%3A%2F%2Fgithub.com%2Fjgpacheco%2Fngx-translate-cache). By following instructions, we'll (1) install the package

```
npm install ngx-translate-cache --save
```

and (2) use it inside of the I18nModule.

```ts
import { TranslateCacheModule, TranslateCacheSettings, TranslateCacheService } from 'ngx-translate-cache';

@NgModule({
  imports: [
    TranslateModule.forRoot(...), // unchanged
    TranslateCacheModule.forRoot({
      cacheService: {
        provide: TranslateCacheService,
        useFactory: translateCacheFactory,
        deps: [TranslateService, TranslateCacheSettings]
      },
      cacheMechanism: 'Cookie'
    })
  ]
})
export class I18nModule {
  constructor(
    translate: TranslateService,
    translateCacheService: TranslateCacheService
  ) {
    translateCacheService.init();
    translate.addLangs(['en', 'ru']);
    const browserLang = translateCacheService.getCachedLanguage() || translate.getBrowserLang();
    translate.use(browserLang.match(/en|ru/) ? browserLang : 'en');
  }
}

export function translateCacheFactory(
  translateService: TranslateService,
  translateCacheSettings: TranslateCacheSettings
) {
  return new TranslateCacheService(translateService, translateCacheSettings);
}
```

Now, if we select the language `ru` and refresh the browser we'll see that it remembered our choice. Notice, that we selected `'Cookies'` as a place to store the selected language. The default selection for this option is `'LocalStorage'`. However, LocalStorage is not accessible on the server. A big part of this article has to do with enabling SSR, so we're being a little bit proactive here and storing the language selection in the place where a server can read it.

Up until now there really was nothing special about this article. We simply followed instructions posted in relevant packages and encapsulated the i18n related logic in a separate module. Adding SSR has some tricky parts, so let's take a closer look.

*** The code up to this point is available [here](https://medium.com/r/?url=https%3A%2F%2Fgithub.com%2FDmitryEfimenko%2Fssr-with-i18n%2Ftree%2Fstep-2).

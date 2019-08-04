import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { makeStateKey, TransferState } from '@angular/platform-browser';
import { TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Observable, of } from 'rxjs';

export class TranslateBrowserLoader implements TranslateLoader {
  constructor(
    private transferState: TransferState,
    private http: HttpClient,
    private prefix: string = './assets/i18n/',
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

export class TranslateFSLoader implements TranslateLoader {
  constructor(
    private transferState: TransferState,
    private prefix = './assets/i18n/',
    private suffix = '.json'
  ) { }

  /**
   * Gets the translations from the server, store them in the transfer state
   */
  public getTranslation(lang: string): Observable<any> {
    const path = join(__dirname, '../browser', this.prefix, `${lang}.${this.suffix}`);
    const data = JSON.parse(readFileSync(path, 'utf8'));

    const key = makeStateKey<any>('transfer-translate-' + lang);
    this.transferState.set(key, data);

    return of(data);
  }
}

export function translateLoaderFactory(httpClient: HttpClient, transferState: TransferState, platform: any) {
  return isPlatformBrowser(platform)
    ? new TranslateBrowserLoader(transferState, httpClient)
    : new TranslateFSLoader(transferState);
}

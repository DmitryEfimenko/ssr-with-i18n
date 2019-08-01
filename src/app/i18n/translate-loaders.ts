import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Observable, of } from 'rxjs';

export class TranslateFSLoader implements TranslateLoader {
  constructor(private prefix = './assets/i18n', private suffix = '.json') { }

  /**
   * Gets the translations from the server, store them in the transfer state
   */
  public getTranslation(lang: string): Observable<any> {
    const path = join(__dirname, '../browser', this.prefix, `${lang}${this.suffix}`);
    const data = JSON.parse(readFileSync(path, 'utf8'));

    return of(data);
  }
}

export function translateLoaderFactory(httpClient: HttpClient, platform: any) {
  return isPlatformBrowser(platform)
    ? new TranslateHttpLoader(httpClient)
    : new TranslateFSLoader();
}

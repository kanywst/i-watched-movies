import { describe, expect, it } from 'vitest';
import { alternateTitles } from './titles';

describe('alternateTitles', () => {
  it('lists English then Japanese under an original-language title', () => {
    expect(
      alternateTitles({ title: '기생충', title_en: 'Parasite', title_ja: 'パラサイト 半地下の家族' }),
    ).toEqual([
      { lang: 'en', text: 'Parasite' },
      { lang: 'ja', text: 'パラサイト 半地下の家族' },
    ]);
  });

  it('skips a name that repeats one already shown', () => {
    expect(alternateTitles({ title: 'Sisu', title_en: 'Sisu', title_ja: 'SISU シス 不死身の男' })).toEqual([
      { lang: 'ja', text: 'SISU シス 不死身の男' },
    ]);
    expect(alternateTitles({ title: '84제곱미터', title_en: '84m2', title_ja: '84m2' })).toEqual([
      { lang: 'en', text: '84m2' },
    ]);
  });

  it('is empty when there is nothing else to call the film', () => {
    expect(alternateTitles({ title: '怪物', title_en: '', title_ja: '' })).toEqual([]);
    expect(alternateTitles({ title: '怪物' })).toEqual([]);
    expect(alternateTitles({ title: 'A', title_en: '  ', title_ja: undefined })).toEqual([]);
  });
});

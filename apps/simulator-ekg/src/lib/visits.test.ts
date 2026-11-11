import { describe, expect, it } from 'vitest';
import { countingDisabled, formatCount } from './visits';
import { feedbackHref } from '../config/site';

describe('Penghitung kunjungan', () => {
  it('format angka Indonesia', () => {
    expect(formatCount('1,234')).toBe('1.234');
    expect(formatCount('12')).toBe('12');
    expect(formatCount('')).toBe('');
  });
  it('tidak menghitung di localhost / uji otomatis', () => {
    expect(countingDisabled({ hostname: 'localhost', protocol: 'http:' }, { webdriver: false })).toBe(true);
    expect(countingDisabled({ hostname: '192.168.1.5', protocol: 'http:' }, { webdriver: false })).toBe(true);
    expect(countingDisabled({ hostname: 'zakyalifp.github.io', protocol: 'https:' }, { webdriver: true })).toBe(true);
    expect(countingDisabled({ hostname: 'zakyalifp.github.io', protocol: 'https:' }, { webdriver: false })).toBe(false);
  });
});

describe('Tautan umpan balik', () => {
  it('null bila URL belum diisi', () => {
    expect(feedbackHref('syn-af-1', '')).toBeNull();
    expect(feedbackHref('syn-af-1', '[URL Google Form]')).toBeNull();
  });
  it('mengganti KASUS_ID dengan ID kasus', () => {
    const u = 'https://docs.google.com/forms/d/e/abc/viewform?usp=pp_url&entry.123=KASUS_ID';
    expect(feedbackHref('ptbxl-00123', u)).toBe('https://docs.google.com/forms/d/e/abc/viewform?usp=pp_url&entry.123=ptbxl-00123');
    expect(feedbackHref(undefined, u)).toBe('https://docs.google.com/forms/d/e/abc/viewform?usp=pp_url&entry.123=');
    expect(feedbackHref('x', 'https://forms.gle/abc')).toBe('https://forms.gle/abc');
  });
});

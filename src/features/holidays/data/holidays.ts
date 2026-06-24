// ── 国家定义 ──────────────────────────────────────────────────────────────────

export interface CountryDef {
  id: string;       // ISO 3166-1 alpha-2
  name: string;     // 中文名
  flag: string;     // emoji
  region: 'asia' | 'americas' | 'europe' | 'mideast' | 'oceania' | 'africa';
}

export const COUNTRIES: CountryDef[] = [
  // 亚太
  { id: 'CN', name: '中国',     flag: '🇨🇳', region: 'asia' },
  { id: 'JP', name: '日本',     flag: '🇯🇵', region: 'asia' },
  { id: 'KR', name: '韩国',     flag: '🇰🇷', region: 'asia' },
  { id: 'SG', name: '新加坡',   flag: '🇸🇬', region: 'asia' },
  { id: 'MY', name: '马来西亚', flag: '🇲🇾', region: 'asia' },
  { id: 'TH', name: '泰国',     flag: '🇹🇭', region: 'asia' },
  { id: 'VN', name: '越南',     flag: '🇻🇳', region: 'asia' },
  { id: 'ID', name: '印尼',     flag: '🇮🇩', region: 'asia' },
  { id: 'PH', name: '菲律宾',   flag: '🇵🇭', region: 'asia' },
  { id: 'IN', name: '印度',     flag: '🇮🇳', region: 'asia' },
  { id: 'AU', name: '澳大利亚', flag: '🇦🇺', region: 'oceania' },
  // 欧洲
  { id: 'GB', name: '英国',     flag: '🇬🇧', region: 'europe' },
  { id: 'DE', name: '德国',     flag: '🇩🇪', region: 'europe' },
  { id: 'FR', name: '法国',     flag: '🇫🇷', region: 'europe' },
  { id: 'IT', name: '意大利',   flag: '🇮🇹', region: 'europe' },
  { id: 'ES', name: '西班牙',   flag: '🇪🇸', region: 'europe' },
  { id: 'NL', name: '荷兰',     flag: '🇳🇱', region: 'europe' },
  { id: 'RU', name: '俄罗斯',   flag: '🇷🇺', region: 'europe' },
  { id: 'TR', name: '土耳其',   flag: '🇹🇷', region: 'europe' },
  // 中东
  { id: 'AE', name: '阿联酋',   flag: '🇦🇪', region: 'mideast' },
  { id: 'SA', name: '沙特',     flag: '🇸🇦', region: 'mideast' },
  { id: 'EG', name: '埃及',     flag: '🇪🇬', region: 'mideast' },
  // 非洲
  { id: 'ZA', name: '南非',     flag: '🇿🇦', region: 'africa' },
  // 美洲
  { id: 'US', name: '美国',     flag: '🇺🇸', region: 'americas' },
  { id: 'CA', name: '加拿大',   flag: '🇨🇦', region: 'americas' },
  { id: 'BR', name: '巴西',     flag: '🇧🇷', region: 'americas' },
  { id: 'MX', name: '墨西哥',   flag: '🇲🇽', region: 'americas' },
  { id: 'AR', name: '阿根廷',   flag: '🇦🇷', region: 'americas' },
];

// ── 假日定义 ──────────────────────────────────────────────────────────────────

export interface HolidayDef {
  id: string;
  /** 开始日期 YYYY-MM-DD */
  date: string;
  /** 假期名称（中文） */
  name: string;
  /** 国家 ID（ISO 3166-1 alpha-2） */
  countryId: string;
  /** 持续天数（默认 1） */
  duration?: number;
  /** 日期为农历/伊斯兰历推算，可能有 ±1~2 天误差 */
  isApprox?: boolean;
  /** 多天假期的类型标签 */
  tag?: 'golden-week' | 'holiday';
}

/**
 * 全球主要贸易国家假日 —— 2026 年（含部分 2027 年初）
 *
 * 数据来源：参考 holidays2026.ts 参考文件 + 官方公告
 * 伊斯兰历/农历假日标注 isApprox:true
 */
export const HOLIDAYS: HolidayDef[] = [

  // ━━ 中国 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'cn-newyear-2026',      date: '2026-01-01', name: '元旦',     countryId: 'CN', duration: 3 },
  { id: 'cn-cny-2026',          date: '2026-02-15', name: '春节',     countryId: 'CN', duration: 7, tag: 'golden-week' },
  { id: 'cn-qingming-2026',     date: '2026-04-04', name: '清明节',   countryId: 'CN', duration: 3 },
  { id: 'cn-labor-2026',        date: '2026-05-01', name: '劳动节',   countryId: 'CN', duration: 5, tag: 'golden-week' },
  { id: 'cn-dragonboat-2026',   date: '2026-06-19', name: '端午节',   countryId: 'CN', duration: 3 },
  { id: 'cn-midautumn-2026',    date: '2026-09-25', name: '中秋节',   countryId: 'CN', duration: 3, isApprox: true },
  { id: 'cn-nationalday-2026',  date: '2026-10-01', name: '国庆节',   countryId: 'CN', duration: 7, tag: 'golden-week' },
  { id: 'cn-newyear-2027',      date: '2027-01-01', name: '元旦',     countryId: 'CN', duration: 3 },
  { id: 'cn-cny-2027',          date: '2027-02-06', name: '春节',     countryId: 'CN', duration: 7, tag: 'golden-week', isApprox: true },

  // ━━ 美国 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'us-newyear-2026',      date: '2026-01-01', name: '元旦',             countryId: 'US' },
  { id: 'us-mlk-2026',          date: '2026-01-19', name: '马丁·路德·金纪念日', countryId: 'US' },
  { id: 'us-presidents-2026',   date: '2026-02-16', name: '总统日',           countryId: 'US' },
  { id: 'us-memorial-2026',     date: '2026-05-25', name: '阵亡将士纪念日',   countryId: 'US' },
  { id: 'us-juneteenth-2026',   date: '2026-06-19', name: '六月节',           countryId: 'US' },
  // Jul 4 为周六，观察日为 Jul 3（周五）
  { id: 'us-independence-2026', date: '2026-07-03', name: '独立日（观察日）', countryId: 'US' },
  { id: 'us-labor-2026',        date: '2026-09-07', name: '劳工节',           countryId: 'US' },
  { id: 'us-columbus-2026',     date: '2026-10-12', name: '哥伦布日',         countryId: 'US' },
  { id: 'us-veterans-2026',     date: '2026-11-11', name: '退伍军人节',       countryId: 'US' },
  { id: 'us-thanksgiving-2026', date: '2026-11-26', name: '感恩节',           countryId: 'US' },
  { id: 'us-blackfriday-2026',  date: '2026-11-27', name: '黑色星期五',       countryId: 'US' },
  { id: 'us-christmas-2026',    date: '2026-12-25', name: '圣诞节',           countryId: 'US' },
  { id: 'us-newyear-2027',      date: '2027-01-01', name: '元旦',             countryId: 'US' },
  { id: 'us-mlk-2027',          date: '2027-01-18', name: '马丁·路德·金纪念日', countryId: 'US' },

  // ━━ 英国 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'gb-newyear-2026',      date: '2026-01-01', name: '元旦',           countryId: 'GB' },
  { id: 'gb-goodfri-2026',      date: '2026-04-03', name: '耶稣受难日',     countryId: 'GB' },
  { id: 'gb-eastermn-2026',     date: '2026-04-06', name: '复活节星期一',   countryId: 'GB' },
  { id: 'gb-mayday-2026',       date: '2026-05-04', name: '五月银行假日',   countryId: 'GB' },
  { id: 'gb-spring-2026',       date: '2026-05-25', name: '春季银行假日',   countryId: 'GB' },
  { id: 'gb-summer-2026',       date: '2026-08-31', name: '夏季银行假日',   countryId: 'GB' },
  { id: 'gb-christmas-2026',    date: '2026-12-25', name: '圣诞节',         countryId: 'GB' },
  { id: 'gb-boxing-2026',       date: '2026-12-26', name: '节礼日',         countryId: 'GB' },
  { id: 'gb-newyear-2027',      date: '2027-01-01', name: '元旦',           countryId: 'GB' },

  // ━━ 德国 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'de-newyear-2026',      date: '2026-01-01', name: '元旦',             countryId: 'DE' },
  { id: 'de-goodfri-2026',      date: '2026-04-03', name: '耶稣受难日',       countryId: 'DE' },
  { id: 'de-eastermn-2026',     date: '2026-04-06', name: '复活节星期一',     countryId: 'DE' },
  { id: 'de-labor-2026',        date: '2026-05-01', name: '劳动节',           countryId: 'DE' },
  { id: 'de-ascension-2026',    date: '2026-05-14', name: '耶稣升天日',       countryId: 'DE' },
  { id: 'de-whit-2026',         date: '2026-05-25', name: '圣灵降临节',       countryId: 'DE' },
  { id: 'de-unity-2026',        date: '2026-10-03', name: '德国统一日',       countryId: 'DE' },
  { id: 'de-xmas1-2026',        date: '2026-12-25', name: '圣诞节',           countryId: 'DE' },
  { id: 'de-xmas2-2026',        date: '2026-12-26', name: '圣诞节（第二天）', countryId: 'DE' },
  { id: 'de-newyear-2027',      date: '2027-01-01', name: '元旦',             countryId: 'DE' },

  // ━━ 法国 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'fr-newyear-2026',      date: '2026-01-01', name: '元旦',           countryId: 'FR' },
  { id: 'fr-eastermn-2026',     date: '2026-04-06', name: '复活节星期一',   countryId: 'FR' },
  { id: 'fr-labor-2026',        date: '2026-05-01', name: '劳动节',         countryId: 'FR' },
  { id: 'fr-victory-2026',      date: '2026-05-08', name: '二战胜利纪念日', countryId: 'FR' },
  { id: 'fr-ascension-2026',    date: '2026-05-14', name: '耶稣升天日',     countryId: 'FR' },
  { id: 'fr-whit-2026',         date: '2026-05-25', name: '圣灵降临节',     countryId: 'FR' },
  { id: 'fr-bastille-2026',     date: '2026-07-14', name: '法国国庆日',     countryId: 'FR' },
  { id: 'fr-assumption-2026',   date: '2026-08-15', name: '圣母升天日',     countryId: 'FR' },
  { id: 'fr-allsaints-2026',    date: '2026-11-01', name: '诸圣节',         countryId: 'FR' },
  { id: 'fr-armistice-2026',    date: '2026-11-11', name: '停战纪念日',     countryId: 'FR' },
  { id: 'fr-christmas-2026',    date: '2026-12-25', name: '圣诞节',         countryId: 'FR' },
  { id: 'fr-newyear-2027',      date: '2027-01-01', name: '元旦',           countryId: 'FR' },

  // ━━ 意大利 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'it-newyear-2026',      date: '2026-01-01', name: '元旦',           countryId: 'IT' },
  { id: 'it-epiphany-2026',     date: '2026-01-06', name: '主显节',         countryId: 'IT' },
  { id: 'it-eastermn-2026',     date: '2026-04-06', name: '复活节星期一',   countryId: 'IT' },
  { id: 'it-liberation-2026',   date: '2026-04-25', name: '解放纪念日',     countryId: 'IT' },
  { id: 'it-labor-2026',        date: '2026-05-01', name: '劳动节',         countryId: 'IT' },
  { id: 'it-republic-2026',     date: '2026-06-02', name: '共和国日',       countryId: 'IT' },
  { id: 'it-ferragosto-2026',   date: '2026-08-15', name: '圣母升天节',     countryId: 'IT' },
  { id: 'it-allsaints-2026',    date: '2026-11-01', name: '诸圣节',         countryId: 'IT' },
  { id: 'it-immacolata-2026',   date: '2026-12-08', name: '圣母无原罪节',   countryId: 'IT' },
  { id: 'it-christmas-2026',    date: '2026-12-25', name: '圣诞节',         countryId: 'IT' },
  { id: 'it-stephen-2026',      date: '2026-12-26', name: '圣斯德望日',     countryId: 'IT' },
  { id: 'it-newyear-2027',      date: '2027-01-01', name: '元旦',           countryId: 'IT' },

  // ━━ 西班牙 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'es-newyear-2026',      date: '2026-01-01', name: '元旦',           countryId: 'ES' },
  { id: 'es-epiphany-2026',     date: '2026-01-06', name: '主显节',         countryId: 'ES' },
  { id: 'es-goodfri-2026',      date: '2026-04-03', name: '耶稣受难日',     countryId: 'ES' },
  { id: 'es-labor-2026',        date: '2026-05-01', name: '劳动节',         countryId: 'ES' },
  { id: 'es-assumption-2026',   date: '2026-08-15', name: '圣母升天日',     countryId: 'ES' },
  { id: 'es-national-2026',     date: '2026-10-12', name: '国庆日',         countryId: 'ES' },
  { id: 'es-allsaints-2026',    date: '2026-11-01', name: '诸圣节',         countryId: 'ES' },
  { id: 'es-constitution-2026', date: '2026-12-06', name: '宪法日',         countryId: 'ES' },
  { id: 'es-immacolata-2026',   date: '2026-12-08', name: '圣母无原罪节',   countryId: 'ES' },
  { id: 'es-christmas-2026',    date: '2026-12-25', name: '圣诞节',         countryId: 'ES' },
  { id: 'es-newyear-2027',      date: '2027-01-01', name: '元旦',           countryId: 'ES' },

  // ━━ 荷兰 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'nl-newyear-2026',      date: '2026-01-01', name: '元旦',             countryId: 'NL' },
  { id: 'nl-goodfri-2026',      date: '2026-04-03', name: '耶稣受难日',       countryId: 'NL' },
  { id: 'nl-easter-2026',       date: '2026-04-05', name: '复活节',           countryId: 'NL' },
  { id: 'nl-eastermn-2026',     date: '2026-04-06', name: '复活节星期一',     countryId: 'NL' },
  { id: 'nl-kingsday-2026',     date: '2026-04-27', name: '国王节',           countryId: 'NL' },
  { id: 'nl-liberation-2026',   date: '2026-05-05', name: '解放节',           countryId: 'NL' },
  { id: 'nl-ascension-2026',    date: '2026-05-14', name: '耶稣升天日',       countryId: 'NL' },
  { id: 'nl-whit-2026',         date: '2026-05-25', name: '圣灵降临节',       countryId: 'NL' },
  { id: 'nl-xmas1-2026',        date: '2026-12-25', name: '圣诞节',           countryId: 'NL' },
  { id: 'nl-xmas2-2026',        date: '2026-12-26', name: '圣诞节（第二天）', countryId: 'NL' },
  { id: 'nl-newyear-2027',      date: '2027-01-01', name: '元旦',             countryId: 'NL' },

  // ━━ 俄罗斯 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'ru-newyear-2026',      date: '2026-01-01', name: '新年假期',       countryId: 'RU', duration: 8 },
  { id: 'ru-xmas-2026',         date: '2026-01-07', name: '东正教圣诞节',   countryId: 'RU' },
  { id: 'ru-defender-2026',     date: '2026-02-23', name: '祖国保卫者日',   countryId: 'RU' },
  { id: 'ru-women-2026',        date: '2026-03-08', name: '国际妇女节',     countryId: 'RU' },
  { id: 'ru-spring-2026',       date: '2026-05-01', name: '劳动节',         countryId: 'RU' },
  { id: 'ru-victory-2026',      date: '2026-05-09', name: '胜利日',         countryId: 'RU' },
  { id: 'ru-russia-2026',       date: '2026-06-12', name: '俄罗斯日',       countryId: 'RU' },
  { id: 'ru-unity-2026',        date: '2026-11-04', name: '民族团结日',     countryId: 'RU' },
  { id: 'ru-newyear-2027',      date: '2027-01-01', name: '新年假期',       countryId: 'RU', duration: 8 },

  // ━━ 土耳其 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'tr-newyear-2026',      date: '2026-01-01', name: '元旦',               countryId: 'TR' },
  { id: 'tr-national-2026',     date: '2026-04-23', name: '国家主权暨儿童节',   countryId: 'TR' },
  { id: 'tr-labor-2026',        date: '2026-05-01', name: '劳动节',             countryId: 'TR' },
  { id: 'tr-ataturk-2026',      date: '2026-05-19', name: '阿塔图尔克纪念日', countryId: 'TR' },
  { id: 'tr-democracy-2026',    date: '2026-07-15', name: '民主与国家团结节',   countryId: 'TR' },
  { id: 'tr-victory-2026',      date: '2026-08-30', name: '胜利纪念日',         countryId: 'TR' },
  { id: 'tr-republic-2026',     date: '2026-10-29', name: '共和国日',           countryId: 'TR', duration: 2 },
  { id: 'tr-newyear-2027',      date: '2027-01-01', name: '元旦',               countryId: 'TR' },

  // ━━ 澳大利亚 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'au-newyear-2026',      date: '2026-01-01', name: '元旦',             countryId: 'AU' },
  { id: 'au-australiaday-2026', date: '2026-01-26', name: '澳大利亚国庆日',   countryId: 'AU' },
  { id: 'au-goodfri-2026',      date: '2026-04-03', name: '耶稣受难日',       countryId: 'AU' },
  { id: 'au-eastersat-2026',    date: '2026-04-04', name: '复活节前夕',       countryId: 'AU' },
  { id: 'au-eastermn-2026',     date: '2026-04-06', name: '复活节星期一',     countryId: 'AU' },
  { id: 'au-anzac-2026',        date: '2026-04-25', name: '澳新军团纪念日',   countryId: 'AU' },
  { id: 'au-kingsbirthday-2026',date: '2026-06-08', name: '国王诞辰',         countryId: 'AU' },
  { id: 'au-christmas-2026',    date: '2026-12-25', name: '圣诞节',           countryId: 'AU' },
  { id: 'au-boxing-2026',       date: '2026-12-26', name: '节礼日',           countryId: 'AU' },
  { id: 'au-newyear-2027',      date: '2027-01-01', name: '元旦',             countryId: 'AU' },
  { id: 'au-australiaday-2027', date: '2027-01-26', name: '澳大利亚国庆日',   countryId: 'AU' },

  // ━━ 日本 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'jp-newyear-2026',      date: '2026-01-01', name: '元日',         countryId: 'JP', duration: 3 },
  { id: 'jp-coming-2026',       date: '2026-01-12', name: '成人节',       countryId: 'JP' },
  { id: 'jp-foundation-2026',   date: '2026-02-11', name: '建国纪念日',   countryId: 'JP' },
  { id: 'jp-emperor-2026',      date: '2026-02-23', name: '天皇诞生日',   countryId: 'JP' },
  { id: 'jp-vernal-2026',       date: '2026-03-20', name: '春分之日',     countryId: 'JP' },
  { id: 'jp-showa-2026',        date: '2026-04-29', name: '昭和日',       countryId: 'JP' },
  // 黄金周：宪法纪念日(5/3)、绿色节(5/4)、儿童节(5/5)、振替休日(5/6)
  { id: 'jp-golden-2026',       date: '2026-05-03', name: '黄金周',       countryId: 'JP', duration: 4, tag: 'golden-week' },
  { id: 'jp-marine-2026',       date: '2026-07-20', name: '海之日',       countryId: 'JP' },
  { id: 'jp-mountain-2026',     date: '2026-08-11', name: '山之日',       countryId: 'JP' },
  { id: 'jp-respect-2026',      date: '2026-09-21', name: '敬老节',       countryId: 'JP' },
  { id: 'jp-autumnal-2026',     date: '2026-09-23', name: '秋分之日',     countryId: 'JP' },
  { id: 'jp-sports-2026',       date: '2026-10-12', name: '体育节',       countryId: 'JP' },
  { id: 'jp-culture-2026',      date: '2026-11-03', name: '文化节',       countryId: 'JP' },
  { id: 'jp-labor-2026',        date: '2026-11-23', name: '勤劳感谢节',   countryId: 'JP' },
  { id: 'jp-newyear-2027',      date: '2027-01-01', name: '元日',         countryId: 'JP', duration: 3 },

  // ━━ 韩国 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'kr-newyear-2026',      date: '2026-01-01', name: '元旦',         countryId: 'KR' },
  { id: 'kr-seollal-2026',      date: '2026-02-16', name: '春节（元旦）', countryId: 'KR', duration: 3, isApprox: true },
  { id: 'kr-independence-2026', date: '2026-03-01', name: '三一节',       countryId: 'KR' },
  { id: 'kr-children-2026',     date: '2026-05-05', name: '儿童节',       countryId: 'KR' },
  { id: 'kr-buddha-2026',       date: '2026-05-24', name: '佛诞节',       countryId: 'KR', isApprox: true },
  { id: 'kr-memorial-2026',     date: '2026-06-06', name: '显忠日',       countryId: 'KR' },
  { id: 'kr-liberation-2026',   date: '2026-08-15', name: '光复节',       countryId: 'KR' },
  { id: 'kr-chuseok-2026',      date: '2026-09-24', name: '中秋节（秋夕）', countryId: 'KR', duration: 3, isApprox: true },
  { id: 'kr-foundation-2026',   date: '2026-10-03', name: '开天节',       countryId: 'KR' },
  { id: 'kr-hangul-2026',       date: '2026-10-09', name: '韩文节',       countryId: 'KR' },
  { id: 'kr-christmas-2026',    date: '2026-12-25', name: '圣诞节',       countryId: 'KR' },
  { id: 'kr-newyear-2027',      date: '2027-01-01', name: '元旦',         countryId: 'KR' },

  // ━━ 印度 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'in-republic-2026',     date: '2026-01-26', name: '共和国日',             countryId: 'IN' },
  { id: 'in-holi-2026',         date: '2026-03-03', name: '胡里节（洒红节）',     countryId: 'IN', isApprox: true },
  { id: 'in-goodfri-2026',      date: '2026-04-03', name: '耶稣受难日',           countryId: 'IN' },
  { id: 'in-ambedkar-2026',     date: '2026-04-14', name: '安贝德卡尔博士纪念日', countryId: 'IN' },
  { id: 'in-labor-2026',        date: '2026-05-01', name: '劳动节',               countryId: 'IN' },
  { id: 'in-independence-2026', date: '2026-08-15', name: '独立日',               countryId: 'IN' },
  { id: 'in-gandhi-2026',       date: '2026-10-02', name: '甘地纪念日',           countryId: 'IN' },
  { id: 'in-dussehra-2026',     date: '2026-10-21', name: '十胜节',               countryId: 'IN', isApprox: true },
  { id: 'in-diwali-2026',       date: '2026-11-08', name: '排灯节',               countryId: 'IN', isApprox: true },
  { id: 'in-christmas-2026',    date: '2026-12-25', name: '圣诞节',               countryId: 'IN' },
  { id: 'in-republic-2027',     date: '2027-01-26', name: '共和国日',             countryId: 'IN' },

  // ━━ 新加坡 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'sg-newyear-2026',      date: '2026-01-01', name: '元旦',       countryId: 'SG' },
  { id: 'sg-cny-2026',          date: '2026-02-17', name: '春节',       countryId: 'SG', duration: 2 },
  { id: 'sg-eidfitr-2026',      date: '2026-03-20', name: '开斋节',     countryId: 'SG', isApprox: true },
  { id: 'sg-goodfri-2026',      date: '2026-04-03', name: '耶稣受难日', countryId: 'SG' },
  { id: 'sg-labor-2026',        date: '2026-05-01', name: '劳动节',     countryId: 'SG' },
  { id: 'sg-vesak-2026',        date: '2026-05-31', name: '卫塞节',     countryId: 'SG', isApprox: true },
  { id: 'sg-eidadha-2026',      date: '2026-05-27', name: '宰牲节',     countryId: 'SG', isApprox: true },
  { id: 'sg-national-2026',     date: '2026-08-09', name: '国庆日',     countryId: 'SG' },
  { id: 'sg-deepavali-2026',    date: '2026-10-27', name: '屠妖节',     countryId: 'SG', isApprox: true },
  { id: 'sg-christmas-2026',    date: '2026-12-25', name: '圣诞节',     countryId: 'SG' },
  { id: 'sg-newyear-2027',      date: '2027-01-01', name: '元旦',       countryId: 'SG' },

  // ━━ 马来西亚 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'my-newyear-2026',      date: '2026-01-01', name: '元旦',           countryId: 'MY' },
  { id: 'my-thaipusam-2026',    date: '2026-02-01', name: '大宝森节',       countryId: 'MY', isApprox: true },
  { id: 'my-cny-2026',          date: '2026-02-17', name: '春节',           countryId: 'MY', duration: 2 },
  { id: 'my-eidfitr-2026',      date: '2026-03-20', name: '开斋节',         countryId: 'MY', duration: 2, isApprox: true },
  { id: 'my-labor-2026',        date: '2026-05-01', name: '劳动节',         countryId: 'MY' },
  { id: 'my-wesak-2026',        date: '2026-05-31', name: '卫塞节',         countryId: 'MY', isApprox: true },
  { id: 'my-agong-2026',        date: '2026-06-01', name: '最高元首诞辰',   countryId: 'MY' },
  { id: 'my-eidadha-2026',      date: '2026-05-27', name: '宰牲节',         countryId: 'MY', isApprox: true },
  { id: 'my-national-2026',     date: '2026-08-31', name: '独立日',         countryId: 'MY' },
  { id: 'my-malaysia-2026',     date: '2026-09-16', name: '马来西亚日',     countryId: 'MY' },
  { id: 'my-deepavali-2026',    date: '2026-11-09', name: '屠妖节',         countryId: 'MY', isApprox: true },
  { id: 'my-christmas-2026',    date: '2026-12-25', name: '圣诞节',         countryId: 'MY' },
  { id: 'my-newyear-2027',      date: '2027-01-01', name: '元旦',           countryId: 'MY' },

  // ━━ 泰国 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'th-newyear-2026',      date: '2026-01-01', name: '元旦',             countryId: 'TH' },
  { id: 'th-makha-2026',        date: '2026-02-10', name: '万佛节',           countryId: 'TH', isApprox: true },
  { id: 'th-chakri-2026',       date: '2026-04-06', name: '却克里纪念日',     countryId: 'TH' },
  { id: 'th-songkran-2026',     date: '2026-04-13', name: '泼水节（宋干节）', countryId: 'TH', duration: 3 },
  { id: 'th-labor-2026',        date: '2026-05-01', name: '劳动节',           countryId: 'TH' },
  { id: 'th-coronation-2026',   date: '2026-05-04', name: '加冕纪念日',       countryId: 'TH' },
  { id: 'th-visakha-2026',      date: '2026-05-11', name: '佛陀节',           countryId: 'TH', isApprox: true },
  { id: 'th-king-2026',         date: '2026-07-28', name: '国王诞辰',         countryId: 'TH' },
  { id: 'th-queen-2026',        date: '2026-08-12', name: '王后诞辰',         countryId: 'TH' },
  { id: 'th-memorial-2026',     date: '2026-10-13', name: '九世王纪念日',     countryId: 'TH' },
  { id: 'th-chula-2026',        date: '2026-10-23', name: '五世王纪念日',     countryId: 'TH' },
  { id: 'th-kingbirthday-2026', date: '2026-12-05', name: '老国王诞辰纪念',   countryId: 'TH' },
  { id: 'th-constitution-2026', date: '2026-12-10', name: '宪法日',           countryId: 'TH' },
  { id: 'th-newyear-2027',      date: '2027-01-01', name: '元旦',             countryId: 'TH' },

  // ━━ 越南（新增）━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'vn-newyear-2026',      date: '2026-01-01', name: '元旦',               countryId: 'VN' },
  { id: 'vn-tet-2026',          date: '2026-02-15', name: '春节（Tết）',        countryId: 'VN', duration: 5, tag: 'golden-week', isApprox: true },
  { id: 'vn-hungkings-2026',    date: '2026-04-26', name: '雄王纪念日',         countryId: 'VN', isApprox: true },
  { id: 'vn-reunification-2026',date: '2026-04-30', name: '统一日',             countryId: 'VN' },
  { id: 'vn-labor-2026',        date: '2026-05-01', name: '国际劳动节',         countryId: 'VN' },
  { id: 'vn-national-2026',     date: '2026-09-02', name: '国庆节',             countryId: 'VN' },
  { id: 'vn-newyear-2027',      date: '2027-01-01', name: '元旦',               countryId: 'VN' },

  // ━━ 印尼（新增）━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'id-newyear-2026',      date: '2026-01-01', name: '元旦',               countryId: 'ID' },
  { id: 'id-cny-2026',          date: '2026-02-17', name: '春节',               countryId: 'ID' },
  { id: 'id-nyepi-2026',        date: '2026-03-19', name: '宁静日（巴厘新年）', countryId: 'ID', isApprox: true },
  { id: 'id-eidfitr-2026',      date: '2026-03-20', name: '开斋节',             countryId: 'ID', duration: 2, isApprox: true },
  { id: 'id-labor-2026',        date: '2026-05-01', name: '劳动节',             countryId: 'ID' },
  { id: 'id-eidadha-2026',      date: '2026-05-27', name: '宰牲节',             countryId: 'ID', isApprox: true },
  { id: 'id-pancasila-2026',    date: '2026-06-01', name: '建国五基日',         countryId: 'ID' },
  { id: 'id-independence-2026', date: '2026-08-17', name: '独立日',             countryId: 'ID' },
  { id: 'id-christmas-2026',    date: '2026-12-25', name: '圣诞节',             countryId: 'ID' },
  { id: 'id-newyear-2027',      date: '2027-01-01', name: '元旦',               countryId: 'ID' },

  // ━━ 菲律宾（新增）━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'ph-newyear-2026',      date: '2026-01-01', name: '元旦',       countryId: 'PH' },
  { id: 'ph-goodfri-2026',      date: '2026-04-03', name: '耶稣受难日', countryId: 'PH' },
  { id: 'ph-labor-2026',        date: '2026-05-01', name: '劳动节',     countryId: 'PH' },
  { id: 'ph-independence-2026', date: '2026-06-12', name: '独立日',     countryId: 'PH' },
  { id: 'ph-heroes-2026',       date: '2026-08-31', name: '全国英雄节', countryId: 'PH' },
  { id: 'ph-allsaints-2026',    date: '2026-11-01', name: '诸圣节',     countryId: 'PH' },
  { id: 'ph-bonifacio-2026',    date: '2026-11-30', name: '波尼法西奥日', countryId: 'PH' },
  { id: 'ph-christmas-2026',    date: '2026-12-25', name: '圣诞节',     countryId: 'PH' },
  { id: 'ph-rizal-2026',        date: '2026-12-30', name: '黎刹日',     countryId: 'PH' },
  { id: 'ph-newyear-2027',      date: '2027-01-01', name: '元旦',       countryId: 'PH' },

  // ━━ 阿联酋 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'ae-newyear-2026',      date: '2026-01-01', name: '元旦',           countryId: 'AE' },
  { id: 'ae-ramadan-2026',      date: '2026-02-18', name: '斋月开始',       countryId: 'AE', isApprox: true },
  { id: 'ae-eidfitr-2026',      date: '2026-03-20', name: '开斋节',         countryId: 'AE', duration: 3, isApprox: true },
  { id: 'ae-eidadha-2026',      date: '2026-05-27', name: '宰牲节',         countryId: 'AE', duration: 3, isApprox: true },
  { id: 'ae-hijri-2026',        date: '2026-06-16', name: '伊斯兰新年',     countryId: 'AE', isApprox: true },
  { id: 'ae-mawlid-2026',       date: '2026-08-25', name: '先知诞辰',       countryId: 'AE', isApprox: true },
  { id: 'ae-national-2026',     date: '2026-12-02', name: '国庆日',         countryId: 'AE', duration: 2 },
  { id: 'ae-newyear-2027',      date: '2027-01-01', name: '元旦',           countryId: 'AE' },

  // ━━ 沙特 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'sa-founding-2026',     date: '2026-02-22', name: '建国日',         countryId: 'SA' },
  { id: 'sa-ramadan-2026',      date: '2026-02-18', name: '斋月开始',       countryId: 'SA', isApprox: true },
  { id: 'sa-eidfitr-2026',      date: '2026-03-20', name: '开斋节',         countryId: 'SA', duration: 4, isApprox: true },
  { id: 'sa-eidadha-2026',      date: '2026-05-27', name: '宰牲节',         countryId: 'SA', duration: 4, isApprox: true },
  { id: 'sa-hijri-2026',        date: '2026-06-16', name: '伊斯兰新年',     countryId: 'SA', isApprox: true },
  { id: 'sa-mawlid-2026',       date: '2026-08-25', name: '先知诞辰',       countryId: 'SA', isApprox: true },
  { id: 'sa-national-2026',     date: '2026-09-23', name: '国庆日',         countryId: 'SA' },

  // ━━ 埃及（新增）━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'eg-newyear-2026',      date: '2026-01-01', name: '元旦',           countryId: 'EG' },
  { id: 'eg-revolution-jan',    date: '2026-01-25', name: '一月革命纪念日', countryId: 'EG' },
  { id: 'eg-eidfitr-2026',      date: '2026-03-20', name: '开斋节',         countryId: 'EG', duration: 3, isApprox: true },
  { id: 'eg-sinai-2026',        date: '2026-04-25', name: '西奈解放日',     countryId: 'EG' },
  { id: 'eg-eidadha-2026',      date: '2026-05-27', name: '宰牲节',         countryId: 'EG', duration: 3, isApprox: true },
  { id: 'eg-june30-2026',       date: '2026-06-30', name: '六三○革命纪念日', countryId: 'EG' },
  { id: 'eg-jul23-2026',        date: '2026-07-23', name: '七二三革命纪念日', countryId: 'EG' },
  { id: 'eg-armedforces-2026',  date: '2026-10-06', name: '武装力量日',     countryId: 'EG' },
  { id: 'eg-newyear-2027',      date: '2027-01-01', name: '元旦',           countryId: 'EG' },

  // ━━ 南非（新增）━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'za-newyear-2026',      date: '2026-01-01', name: '元旦',       countryId: 'ZA' },
  { id: 'za-humanrights-2026',  date: '2026-03-21', name: '人权日',     countryId: 'ZA' },
  { id: 'za-goodfri-2026',      date: '2026-04-03', name: '耶稣受难日', countryId: 'ZA' },
  { id: 'za-familyday-2026',    date: '2026-04-06', name: '家庭日',     countryId: 'ZA' },
  { id: 'za-freedom-2026',      date: '2026-04-27', name: '自由日',     countryId: 'ZA' },
  { id: 'za-labor-2026',        date: '2026-05-01', name: '工人节',     countryId: 'ZA' },
  { id: 'za-youth-2026',        date: '2026-06-16', name: '青年节',     countryId: 'ZA' },
  { id: 'za-womens-2026',       date: '2026-08-09', name: '全国妇女节', countryId: 'ZA' },
  { id: 'za-heritage-2026',     date: '2026-09-24', name: '文化遗产日', countryId: 'ZA' },
  { id: 'za-reconciliation-2026',date:'2026-12-16', name: '和解日',     countryId: 'ZA' },
  { id: 'za-christmas-2026',    date: '2026-12-25', name: '圣诞节',     countryId: 'ZA' },
  { id: 'za-boxing-2026',       date: '2026-12-26', name: '善意日',     countryId: 'ZA' },
  { id: 'za-newyear-2027',      date: '2027-01-01', name: '元旦',       countryId: 'ZA' },

  // ━━ 加拿大 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'ca-newyear-2026',      date: '2026-01-01', name: '元旦',               countryId: 'CA' },
  { id: 'ca-family-2026',       date: '2026-02-16', name: '家庭日',             countryId: 'CA' },
  { id: 'ca-goodfri-2026',      date: '2026-04-03', name: '耶稣受难日',         countryId: 'CA' },
  { id: 'ca-eastermn-2026',     date: '2026-04-06', name: '复活节星期一',       countryId: 'CA' },
  { id: 'ca-victoria-2026',     date: '2026-05-18', name: '维多利亚日',         countryId: 'CA' },
  { id: 'ca-national-2026',     date: '2026-07-01', name: '加拿大国庆日',       countryId: 'CA' },
  { id: 'ca-civic-2026',        date: '2026-08-03', name: '市政假日',           countryId: 'CA' },
  { id: 'ca-labor-2026',        date: '2026-09-07', name: '劳工节',             countryId: 'CA' },
  { id: 'ca-truth-2026',        date: '2026-09-30', name: '真相与和解日',       countryId: 'CA' },
  { id: 'ca-thanksgiving-2026', date: '2026-10-12', name: '感恩节',             countryId: 'CA' },
  { id: 'ca-remembrance-2026',  date: '2026-11-11', name: '纪念日',             countryId: 'CA' },
  { id: 'ca-christmas-2026',    date: '2026-12-25', name: '圣诞节',             countryId: 'CA' },
  { id: 'ca-boxing-2026',       date: '2026-12-26', name: '节礼日',             countryId: 'CA' },
  { id: 'ca-newyear-2027',      date: '2027-01-01', name: '元旦',               countryId: 'CA' },

  // ━━ 巴西 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'br-newyear-2026',      date: '2026-01-01', name: '元旦',           countryId: 'BR' },
  { id: 'br-carnival-2026',     date: '2026-02-16', name: '狂欢节',         countryId: 'BR', duration: 2 },
  { id: 'br-goodfri-2026',      date: '2026-04-03', name: '耶稣受难日',     countryId: 'BR' },
  { id: 'br-tiradentes-2026',   date: '2026-04-21', name: '蒂拉登特斯日',   countryId: 'BR' },
  { id: 'br-labor-2026',        date: '2026-05-01', name: '劳动节',         countryId: 'BR' },
  { id: 'br-corpus-2026',       date: '2026-06-04', name: '基督圣体节',     countryId: 'BR' },
  { id: 'br-independence-2026', date: '2026-09-07', name: '独立日',         countryId: 'BR' },
  { id: 'br-aparecida-2026',    date: '2026-10-12', name: '圣母显灵节',     countryId: 'BR' },
  { id: 'br-finados-2026',      date: '2026-11-02', name: '亡灵节',         countryId: 'BR' },
  { id: 'br-republic-2026',     date: '2026-11-15', name: '共和国宣告日',   countryId: 'BR' },
  { id: 'br-black-2026',        date: '2026-11-20', name: '黑人意识日',     countryId: 'BR' },
  { id: 'br-christmas-2026',    date: '2026-12-25', name: '圣诞节',         countryId: 'BR' },
  { id: 'br-newyear-2027',      date: '2027-01-01', name: '元旦',           countryId: 'BR' },

  // ━━ 墨西哥 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'mx-newyear-2026',      date: '2026-01-01', name: '元旦',               countryId: 'MX' },
  { id: 'mx-constitution-2026', date: '2026-02-02', name: '宪法纪念日',         countryId: 'MX' },
  { id: 'mx-juarez-2026',       date: '2026-03-16', name: '贝尼托·华雷斯诞辰', countryId: 'MX' },
  { id: 'mx-goodfri-2026',      date: '2026-04-03', name: '耶稣受难日',         countryId: 'MX' },
  { id: 'mx-labor-2026',        date: '2026-05-01', name: '劳动节',             countryId: 'MX' },
  { id: 'mx-independence-2026', date: '2026-09-16', name: '独立日',             countryId: 'MX' },
  { id: 'mx-diasmuertos-2026',  date: '2026-11-01', name: '亡灵节',             countryId: 'MX', duration: 2 },
  { id: 'mx-revolution-2026',   date: '2026-11-16', name: '革命纪念日',         countryId: 'MX' },
  { id: 'mx-guadalupe-2026',    date: '2026-12-12', name: '瓜达卢佩圣母节',     countryId: 'MX' },
  { id: 'mx-christmas-2026',    date: '2026-12-25', name: '圣诞节',             countryId: 'MX' },
  { id: 'mx-newyear-2027',      date: '2027-01-01', name: '元旦',               countryId: 'MX' },

  // ━━ 阿根廷（新增）━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  { id: 'ar-newyear-2026',      date: '2026-01-01', name: '元旦',           countryId: 'AR' },
  { id: 'ar-carnival-2026',     date: '2026-02-16', name: '狂欢节',         countryId: 'AR', duration: 2 },
  { id: 'ar-memory-2026',       date: '2026-03-24', name: '全国记忆日',     countryId: 'AR' },
  { id: 'ar-malvinas-2026',     date: '2026-04-02', name: '马岛战争纪念日', countryId: 'AR' },
  { id: 'ar-goodfri-2026',      date: '2026-04-03', name: '耶稣受难日',     countryId: 'AR' },
  { id: 'ar-labor-2026',        date: '2026-05-01', name: '劳动节',         countryId: 'AR' },
  { id: 'ar-mayrevolution-2026',date: '2026-05-25', name: '五月革命纪念日', countryId: 'AR' },
  { id: 'ar-independence-2026', date: '2026-07-09', name: '独立日',         countryId: 'AR' },
  { id: 'ar-sanmartin-2026',    date: '2026-08-17', name: '圣马丁逝世纪念日', countryId: 'AR' },
  { id: 'ar-columbus-2026',     date: '2026-10-12', name: '文化多样性日',   countryId: 'AR' },
  { id: 'ar-christmas-2026',    date: '2026-12-25', name: '圣诞节',         countryId: 'AR' },
  { id: 'ar-newyear-2027',      date: '2027-01-01', name: '元旦',           countryId: 'AR' },
];

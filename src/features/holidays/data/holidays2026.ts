export type HolidayCategory = 'china' | 'international' | 'religious';
export type HolidayReligion = 'islam' | 'jewish' | 'buddhism' | 'hinduism';

export interface Holiday {
  id: string;
  /** YYYY-MM-DD */
  dateStart: string;
  /** YYYY-MM-DD，多日假日 */
  dateEnd?: string;
  /** 总天数，多日时使用 */
  days?: number;
  nameCN: string;
  nameEN: string;
  category: HolidayCategory;
  /** 国旗或宗教符号 emoji */
  emoji?: string;
  /** 宗教类型（仅 category=religious 时使用） */
  religion?: HolidayReligion;
}

export const HOLIDAYS_2026: Holiday[] = [
  // ── 一月 ──────────────────────────────────────────────────────────────────
  { id: 'cn-newyear',          dateStart: '2026-01-01',                       nameCN: '元旦',               nameEN: "New Year's Day",                              category: 'china' },
  { id: 'int-newyear',         dateStart: '2026-01-01',                       nameCN: '国际新年',           nameEN: "New Year's Day",                              category: 'international' },
  { id: 'jp-newyear',          dateStart: '2026-01-02', dateEnd: '2026-01-03', days: 2, nameCN: '日本新年长假', nameEN: 'Japan New Year Holiday',                 category: 'international', emoji: '🇯🇵' },
  { id: 'int-epiphany',        dateStart: '2026-01-06',                       nameCN: '主显节(三王节)',     nameEN: 'Epiphany / Three Kings Day',                  category: 'international' },
  { id: 'ru-orthodox-xmas',    dateStart: '2026-01-07',                       nameCN: '俄罗斯东正教圣诞',  nameEN: 'Orthodox Christmas (Russia)',                  category: 'international', emoji: '🇷🇺' },
  { id: 'pa-martyrs',          dateStart: '2026-01-09',                       nameCN: '烈士日(巴拿马)',     nameEN: "Martyrs' Day (Panama)",                       category: 'international' },
  { id: 'us-mlk',              dateStart: '2026-01-19',                       nameCN: '美国马丁路德金日',   nameEN: 'MLK Day',                                     category: 'international', emoji: '🇺🇸' },
  { id: 'eg-revolution-jan',   dateStart: '2026-01-25',                       nameCN: '埃及革命节',         nameEN: 'Revolution Day (Egypt)',                       category: 'international', emoji: '🇪🇬' },
  { id: 'in-republic',         dateStart: '2026-01-26',                       nameCN: '印度共和国日',       nameEN: 'Republic Day (India)',                         category: 'international', emoji: '🇮🇳' },
  { id: 'au-day',              dateStart: '2026-01-26',                       nameCN: '澳大利亚日',         nameEN: 'Australia Day',                               category: 'international', emoji: '🇦🇺' },
  { id: 'do-duarte',           dateStart: '2026-01-26',                       nameCN: '杜阿尔特日(多米尼加)', nameEN: 'Duarte Day (Dominican Republic)',            category: 'international' },

  // ── 二月 ──────────────────────────────────────────────────────────────────
  { id: 'my-thaipusam',        dateStart: '2026-02-01',                       nameCN: '大宝森节',           nameEN: 'Thaipusam',                                   category: 'religious', emoji: '🇲🇾', religion: 'hinduism' },
  { id: 'mx-constitution',     dateStart: '2026-02-02',                       nameCN: '墨西哥宪法纪念日',   nameEN: 'Constitution Day (Mexico)',                    category: 'international', emoji: '🇲🇽' },
  { id: 'jp-foundation',       dateStart: '2026-02-11',                       nameCN: '日本建国纪念日',     nameEN: 'National Foundation Day (Japan)',              category: 'international', emoji: '🇯🇵' },
  { id: 'int-valentine',       dateStart: '2026-02-14',                       nameCN: '情人节',             nameEN: "Valentine's Day",                             category: 'international' },
  { id: 'cn-spring',           dateStart: '2026-02-15', dateEnd: '2026-02-21', days: 7, nameCN: '春节',       nameEN: 'Chinese New Year',                          category: 'china' },
  { id: 'vn-tet',              dateStart: '2026-02-15', dateEnd: '2026-02-19', days: 5, nameCN: '越南春节(Tết)', nameEN: 'Vietnamese New Year (Tet)',              category: 'international', emoji: '🇻🇳' },
  { id: 'us-presidents',       dateStart: '2026-02-16',                       nameCN: '美国总统日',         nameEN: "Presidents' Day",                             category: 'international', emoji: '🇺🇸' },
  { id: 'kr-seollal',          dateStart: '2026-02-16', dateEnd: '2026-02-18', days: 3, nameCN: '韩国春节(元旦)', nameEN: 'Korean New Year (Seollal)',              category: 'international', emoji: '🇰🇷' },
  { id: 'br-carnaval',         dateStart: '2026-02-16', dateEnd: '2026-02-17', days: 2, nameCN: '巴西狂欢节', nameEN: 'Brazilian Carnaval',                        category: 'international', emoji: '🇧🇷' },
  { id: 'ca-family',           dateStart: '2026-02-16',                       nameCN: '加拿大家庭日',       nameEN: 'Family Day (Canada)',                          category: 'international', emoji: '🇨🇦' },
  { id: 'rel-ramadan',         dateStart: '2026-02-18',                       nameCN: '斋月开始',           nameEN: 'Ramadan Begins',                              category: 'religious', emoji: '☪️', religion: 'islam' },
  { id: 'sa-founding',         dateStart: '2026-02-22',                       nameCN: '沙特建国纪念日',     nameEN: 'Saudi Founding Day',                          category: 'international', emoji: '🇸🇦' },
  { id: 'jp-emperor',          dateStart: '2026-02-23',                       nameCN: '天皇诞辰(日本)',     nameEN: "Emperor's Birthday (Japan)",                  category: 'international', emoji: '🇯🇵' },
  { id: 'do-independence',     dateStart: '2026-02-27',                       nameCN: '多米尼加独立日',     nameEN: 'Dominican Republic Independence Day',          category: 'international' },

  // ── 三月 ──────────────────────────────────────────────────────────────────
  { id: 'kr-independence',     dateStart: '2026-03-01',                       nameCN: '韩国三一节',         nameEN: 'Independence Movement Day (Korea)',            category: 'international', emoji: '🇰🇷' },
  { id: 'in-holi',             dateStart: '2026-03-03',                       nameCN: '胡里节(洒红节)',     nameEN: 'Holi (India)',                                category: 'religious', emoji: '🇮🇳', religion: 'hinduism' },
  { id: 'rel-purim',           dateStart: '2026-03-03',                       nameCN: '普珥节',             nameEN: 'Purim',                                       category: 'religious', emoji: '✡️', religion: 'jewish' },
  { id: 'int-womens',          dateStart: '2026-03-08',                       nameCN: '国际妇女节',         nameEN: "International Women's Day",                   category: 'international' },
  { id: 'mx-juarez',           dateStart: '2026-03-16',                       nameCN: '华雷斯诞辰纪念日(墨西哥)', nameEN: "Benito Juárez's Birthday (Mexico)",     category: 'international', emoji: '🇲🇽' },
  { id: 'id-nyepi',            dateStart: '2026-03-19',                       nameCN: '宁静日·印尼新年(Nyepi)', nameEN: 'Nyepi - Balinese New Year (Indonesia)',  category: 'religious', emoji: '🇮🇩', religion: 'hinduism' },
  { id: 'rel-eid-fitr',        dateStart: '2026-03-20', dateEnd: '2026-03-22', days: 3, nameCN: '开斋节',    nameEN: 'Eid al-Fitr',                               category: 'religious', emoji: '☪️', religion: 'islam' },
  { id: 'ir-nowruz',           dateStart: '2026-03-20',                       nameCN: '诺鲁孜节(波斯新年)', nameEN: 'Nowruz (Persian New Year)',                   category: 'international', emoji: '🇮🇷' },
  { id: 'za-human-rights',     dateStart: '2026-03-21',                       nameCN: '南非人权日',         nameEN: 'Human Rights Day (South Africa)',              category: 'international', emoji: '🇿🇦' },
  { id: 'pr-emancipation',     dateStart: '2026-03-22',                       nameCN: '废奴纪念日(波多黎各)', nameEN: 'Emancipation Day (Puerto Rico)',             category: 'international' },
  { id: 'ar-memory',           dateStart: '2026-03-24',                       nameCN: '全国记忆日(阿根廷)', nameEN: 'National Memory Day (Argentina)',              category: 'international' },

  // ── 四月 ──────────────────────────────────────────────────────────────────
  { id: 'rel-passover',        dateStart: '2026-04-01',                       nameCN: '逾越节',             nameEN: 'Passover (Pesach)',                            category: 'religious', emoji: '✡️', religion: 'jewish' },
  { id: 'int-maundy-thu',      dateStart: '2026-04-02',                       nameCN: '圣周四',             nameEN: 'Maundy Thursday',                             category: 'international' },
  { id: 'ar-malvinas',         dateStart: '2026-04-02',                       nameCN: '马岛战争纪念日(阿根廷)', nameEN: 'Malvinas Day (Argentina)',                category: 'international' },
  { id: 'int-good-friday',     dateStart: '2026-04-03',                       nameCN: '耶稣受难日',         nameEN: 'Good Friday',                                 category: 'international' },
  { id: 'cn-qingming',         dateStart: '2026-04-04', dateEnd: '2026-04-06', days: 3, nameCN: '清明节',    nameEN: 'Tomb Sweeping Day',                         category: 'china' },
  { id: 'int-easter',          dateStart: '2026-04-05',                       nameCN: '复活节',             nameEN: 'Easter Sunday',                               category: 'international' },
  { id: 'int-easter-mon',      dateStart: '2026-04-06',                       nameCN: '复活节周一',         nameEN: 'Easter Monday',                               category: 'international' },
  { id: 'cr-santamaria',       dateStart: '2026-04-11',                       nameCN: '胡安·桑塔玛利亚日(哥斯达黎加)', nameEN: 'Juan Santamaría Day (Costa Rica)', category: 'international' },
  { id: 'th-songkran',         dateStart: '2026-04-13', dateEnd: '2026-04-15', days: 3, nameCN: '宋干节(泰国新年)', nameEN: 'Songkran (Thai New Year)',          category: 'international', emoji: '🇹🇭' },
  { id: 'br-tiradentes',       dateStart: '2026-04-21',                       nameCN: '奇拉登特斯节(巴西)', nameEN: 'Tiradentes Day (Brazil)',                     category: 'international', emoji: '🇧🇷' },
  { id: 'tr-sovereignty',      dateStart: '2026-04-23',                       nameCN: '国家主权和儿童节(土耳其)', nameEN: "National Sovereignty & Children's Day (Turkey)", category: 'international', emoji: '🇹🇷' },
  { id: 'it-liberation',       dateStart: '2026-04-25',                       nameCN: '意大利解放日',       nameEN: 'Liberation Day (Italy)',                       category: 'international', emoji: '🇮🇹' },
  { id: 'au-anzac',            dateStart: '2026-04-25',                       nameCN: '澳新军团日',         nameEN: 'ANZAC Day',                                   category: 'international', emoji: '🇦🇺' },
  { id: 'eg-sinai',            dateStart: '2026-04-25',                       nameCN: '西奈解放日(埃及)',   nameEN: 'Sinai Liberation Day (Egypt)',                 category: 'international', emoji: '🇪🇬' },
  { id: 'vn-hung-kings',       dateStart: '2026-04-26',                       nameCN: '雄王纪念日(越南)',   nameEN: 'Hung Kings Commemoration (Vietnam)',           category: 'international', emoji: '🇻🇳' },
  { id: 'za-freedom',          dateStart: '2026-04-27',                       nameCN: '南非自由日',         nameEN: 'Freedom Day (South Africa)',                   category: 'international', emoji: '🇿🇦' },
  { id: 'nl-kings',            dateStart: '2026-04-27',                       nameCN: '国王日(荷兰)',       nameEN: "King's Day (Netherlands)",                    category: 'international' },
  { id: 'jp-showa',            dateStart: '2026-04-29',                       nameCN: '日本昭和日',         nameEN: 'Japan Showa Day',                             category: 'international', emoji: '🇯🇵' },
  { id: 'vn-reunification',    dateStart: '2026-04-30',                       nameCN: '越南统一日',         nameEN: 'Reunification Day (Vietnam)',                  category: 'international', emoji: '🇻🇳' },

  // ── 五月 ──────────────────────────────────────────────────────────────────
  { id: 'cn-labour',           dateStart: '2026-05-01', dateEnd: '2026-05-05', days: 5, nameCN: '劳动节',    nameEN: 'Labour Day',                                category: 'china' },
  { id: 'int-labour',          dateStart: '2026-05-01',                       nameCN: '国际劳动节',         nameEN: 'International Labour Day',                    category: 'international' },
  { id: 'jp-golden-week',      dateStart: '2026-05-03', dateEnd: '2026-05-06', days: 4, nameCN: '日本黄金周', nameEN: 'Japan Golden Week',                        category: 'international', emoji: '🇯🇵' },
  { id: 'gb-may-bank',         dateStart: '2026-05-04',                       nameCN: '英国五月银行假日',   nameEN: 'Early May Bank Holiday (UK)',                  category: 'international', emoji: '🇬🇧' },
  { id: 'kr-children',         dateStart: '2026-05-05',                       nameCN: '韩国儿童节',         nameEN: "Children's Day (Korea)",                      category: 'international', emoji: '🇰🇷' },
  { id: 'nl-liberation',       dateStart: '2026-05-05',                       nameCN: '解放日(荷兰)',       nameEN: 'Liberation Day (Netherlands)',                 category: 'international' },
  { id: 'fr-ve-day',           dateStart: '2026-05-08',                       nameCN: '欧战胜利纪念日(法国)', nameEN: 'Victory in Europe Day (France)',             category: 'international', emoji: '🇫🇷' },
  { id: 'ru-victory',          dateStart: '2026-05-09',                       nameCN: '俄罗斯胜利日',       nameEN: 'Victory Day (Russia)',                         category: 'international', emoji: '🇷🇺' },
  { id: 'de-ascension',        dateStart: '2026-05-14',                       nameCN: '耶稣升天节(德国)',   nameEN: 'Ascension Day (DE)',                           category: 'international', emoji: '🇩🇪' },
  { id: 'fr-ascension',        dateStart: '2026-05-14',                       nameCN: '耶稣升天节(法国)',   nameEN: 'Ascension Day (France)',                       category: 'international', emoji: '🇫🇷' },
  { id: 'nl-ascension',        dateStart: '2026-05-14',                       nameCN: '耶稣升天节(荷兰)',   nameEN: 'Ascension Day (Netherlands)',                  category: 'international' },
  { id: 'ca-victoria',         dateStart: '2026-05-18',                       nameCN: '加拿大维多利亚日',   nameEN: 'Victoria Day (Canada)',                        category: 'international', emoji: '🇨🇦' },
  { id: 'uy-piedras',          dateStart: '2026-05-18',                       nameCN: '拉斯彼德拉斯战役日(乌拉圭)', nameEN: 'Battle of Las Piedras (Uruguay)',       category: 'international' },
  { id: 'tr-ataturk',          dateStart: '2026-05-19',                       nameCN: '阿塔图尔克纪念日(土耳其)', nameEN: 'Commemoration of Atatürk Day (Turkey)',  category: 'international', emoji: '🇹🇷' },
  { id: 'cl-navy',             dateStart: '2026-05-21',                       nameCN: '海军节(智利)',       nameEN: 'Navy Day (Chile)',                             category: 'international' },
  { id: 'rel-shavuot',         dateStart: '2026-05-21',                       nameCN: '七七节',             nameEN: 'Shavuot',                                     category: 'religious', emoji: '✡️', religion: 'jewish' },
  { id: 'ec-pichincha',        dateStart: '2026-05-24',                       nameCN: '皮钦查战役纪念日(厄瓜多尔)', nameEN: 'Battle of Pichincha (Ecuador)',        category: 'international' },
  { id: 'kr-buddha',           dateStart: '2026-05-24',                       nameCN: '佛诞节(韩国)',       nameEN: "Buddha's Birthday (Korea)",                   category: 'religious', emoji: '🇰🇷', religion: 'buddhism' },
  { id: 'us-memorial',         dateStart: '2026-05-25',                       nameCN: '美国阵亡将士纪念日', nameEN: 'Memorial Day',                                category: 'international', emoji: '🇺🇸' },
  { id: 'gb-spring-bank',      dateStart: '2026-05-25',                       nameCN: '英国春季银行假日',   nameEN: 'Spring Bank Holiday (UK)',                     category: 'international', emoji: '🇬🇧' },
  { id: 'de-whit-mon',         dateStart: '2026-05-25',                       nameCN: '圣灵降临节(德国)',   nameEN: 'Whit Monday (DE)',                             category: 'international', emoji: '🇩🇪' },
  { id: 'ar-may-revolution',   dateStart: '2026-05-25',                       nameCN: '五月革命纪念日(阿根廷)', nameEN: 'May Revolution Day (Argentina)',           category: 'international' },
  { id: 'fr-whit-mon',         dateStart: '2026-05-25',                       nameCN: '圣灵降临节(法国)',   nameEN: 'Whit Monday (France)',                         category: 'international', emoji: '🇫🇷' },
  { id: 'nl-whit-mon',         dateStart: '2026-05-25',                       nameCN: '圣灵降临节(荷兰)',   nameEN: 'Whit Monday (Netherlands)',                    category: 'international' },
  { id: 'rel-eid-adha',        dateStart: '2026-05-27', dateEnd: '2026-05-29', days: 3, nameCN: '宰牲节',    nameEN: 'Eid al-Adha',                               category: 'religious', emoji: '☪️', religion: 'islam' },
  { id: 'rel-vesak',           dateStart: '2026-05-31',                       nameCN: '卫塞节(佛诞)',       nameEN: 'Vesak / Buddha Day',                          category: 'religious', emoji: '☸️', religion: 'buddhism' },

  // ── 六月 ──────────────────────────────────────────────────────────────────
  { id: 'id-pancasila',        dateStart: '2026-06-01',                       nameCN: '建国五基日(印尼)',   nameEN: 'Pancasila Day (Indonesia)',                    category: 'international', emoji: '🇮🇩' },
  { id: 'my-agong',            dateStart: '2026-06-01',                       nameCN: '最高元首诞辰(马来西亚)', nameEN: "Yang di-Pertuan Agong's Birthday (Malaysia)", category: 'international', emoji: '🇲🇾' },
  { id: 'it-republic',         dateStart: '2026-06-02',                       nameCN: '意大利共和国日',     nameEN: 'Italian Republic Day',                        category: 'international', emoji: '🇮🇹' },
  { id: 'br-corpus-christi',   dateStart: '2026-06-04',                       nameCN: '基督圣体节(巴西)',   nameEN: 'Corpus Christi (Brazil)',                      category: 'international', emoji: '🇧🇷' },
  { id: 'au-kings-bday',       dateStart: '2026-06-08',                       nameCN: '国王诞辰日(澳大利亚)', nameEN: "King's Birthday (Australia)",               category: 'international', emoji: '🇦🇺' },
  { id: 'ru-russia-day',       dateStart: '2026-06-12',                       nameCN: '俄罗斯国庆日',       nameEN: 'Russia Day',                                  category: 'international', emoji: '🇷🇺' },
  { id: 'ph-independence',     dateStart: '2026-06-12',                       nameCN: '菲律宾独立日',       nameEN: 'Philippines Independence Day',                category: 'international', emoji: '🇵🇭' },
  { id: 'rel-islamic-ny',      dateStart: '2026-06-16',                       nameCN: '伊斯兰新年',         nameEN: 'Islamic New Year (Hijri)',                     category: 'religious', emoji: '☪️', religion: 'islam' },
  { id: 'za-youth',            dateStart: '2026-06-16',                       nameCN: '青年节(南非)',       nameEN: 'Youth Day (South Africa)',                     category: 'international', emoji: '🇿🇦' },
  { id: 'cn-dragon-boat',      dateStart: '2026-06-19', dateEnd: '2026-06-21', days: 3, nameCN: '端午节',    nameEN: 'Dragon Boat Festival',                      category: 'china' },
  { id: 'us-juneteenth',       dateStart: '2026-06-19',                       nameCN: '美国黑人解放日',     nameEN: 'Juneteenth',                                  category: 'international', emoji: '🇺🇸' },
  { id: 'uy-artigas',          dateStart: '2026-06-19',                       nameCN: '阿蒂加斯日(乌拉圭)', nameEN: 'Artigas Day (Uruguay)',                       category: 'international' },
  { id: 'eg-june30',           dateStart: '2026-06-30',                       nameCN: '6·30革命纪念日(埃及)', nameEN: 'June 30 Revolution (Egypt)',               category: 'international', emoji: '🇪🇬' },

  // ── 七月 ──────────────────────────────────────────────────────────────────
  { id: 'ca-canada-day',       dateStart: '2026-07-01',                       nameCN: '加拿大国庆日',       nameEN: 'Canada Day',                                  category: 'international', emoji: '🇨🇦' },
  { id: 'us-independence',     dateStart: '2026-07-03',                       nameCN: '美国独立日（观察日）',nameEN: 'US Independence Day (Observed)',               category: 'international', emoji: '🇺🇸' },
  { id: 'ar-independence',     dateStart: '2026-07-09',                       nameCN: '阿根廷独立日',       nameEN: 'Argentina Independence Day',                  category: 'international' },
  { id: 'fr-bastille',         dateStart: '2026-07-14',                       nameCN: '法国国庆日',         nameEN: 'Bastille Day (France)',                        category: 'international', emoji: '🇫🇷' },
  { id: 'uy-constitution',     dateStart: '2026-07-18',                       nameCN: '宪法日(乌拉圭)',     nameEN: 'Constitution Day (Uruguay)',                   category: 'international' },
  { id: 'jp-marine',           dateStart: '2026-07-20',                       nameCN: '日本海洋日',         nameEN: 'Marine Day (Japan)',                           category: 'international', emoji: '🇯🇵' },
  { id: 'co-independence',     dateStart: '2026-07-20',                       nameCN: '哥伦比亚独立日',     nameEN: 'Colombia Independence Day',                   category: 'international' },
  { id: 'eg-jul23',            dateStart: '2026-07-23',                       nameCN: '7·23革命日(埃及)',   nameEN: 'July 23 Revolution (Egypt)',                  category: 'international', emoji: '🇪🇬' },
  { id: 'pr-constitution',     dateStart: '2026-07-25',                       nameCN: '波多黎各宪法日',     nameEN: 'Puerto Rico Constitution Day',                category: 'international' },
  { id: 'pe-independence',     dateStart: '2026-07-28',                       nameCN: '秘鲁独立日',         nameEN: 'Peru Independence Day',                       category: 'international' },
  { id: 'pe-armed-forces',     dateStart: '2026-07-29',                       nameCN: '秘鲁武装力量日',     nameEN: 'Armed Forces Day (Peru)',                      category: 'international' },

  // ── 八月 ──────────────────────────────────────────────────────────────────
  { id: 'tt-emancipation',     dateStart: '2026-08-01',                       nameCN: '解放日(特多)',       nameEN: 'Emancipation Day (Trinidad & Tobago)',         category: 'international' },
  { id: 'co-boyaca',           dateStart: '2026-08-07',                       nameCN: '博亚卡战役纪念日(哥伦比亚)', nameEN: 'Battle of Boyacá Day (Colombia)',      category: 'international' },
  { id: 'sg-national',         dateStart: '2026-08-09',                       nameCN: '新加坡国庆节',       nameEN: 'Singapore National Day',                      category: 'international', emoji: '🇸🇬' },
  { id: 'za-womens',           dateStart: '2026-08-09',                       nameCN: '全国妇女节(南非)',   nameEN: "National Women's Day (South Africa)",          category: 'international', emoji: '🇿🇦' },
  { id: 'ec-independence',     dateStart: '2026-08-10',                       nameCN: '厄瓜多尔独立日',     nameEN: 'Ecuador Independence Day',                    category: 'international' },
  { id: 'jp-mountain',         dateStart: '2026-08-11',                       nameCN: '日本山之日',         nameEN: 'Mountain Day (Japan)',                         category: 'international', emoji: '🇯🇵' },
  { id: 'int-assumption',      dateStart: '2026-08-15',                       nameCN: '圣母升天节',         nameEN: 'Assumption of Mary',                          category: 'international' },
  { id: 'kr-liberation',       dateStart: '2026-08-15',                       nameCN: '韩国光复节',         nameEN: 'Liberation Day (Korea)',                       category: 'international', emoji: '🇰🇷' },
  { id: 'in-independence',     dateStart: '2026-08-15',                       nameCN: '印度独立日',         nameEN: 'Independence Day (India)',                     category: 'international', emoji: '🇮🇳' },
  { id: 'do-restoration',      dateStart: '2026-08-16',                       nameCN: '多米尼加复国日',     nameEN: 'Dominican Restoration Day',                   category: 'international' },
  { id: 'id-independence',     dateStart: '2026-08-17',                       nameCN: '印尼独立日',         nameEN: 'Indonesia Independence Day',                  category: 'international', emoji: '🇮🇩' },
  { id: 'rel-mawlid',          dateStart: '2026-08-25',                       nameCN: '先知诞辰(圣纪)',     nameEN: 'Mawlid al-Nabi',                              category: 'religious', emoji: '☪️', religion: 'islam' },
  { id: 'uy-independence',     dateStart: '2026-08-25',                       nameCN: '乌拉圭独立日',       nameEN: 'Uruguay Independence Day',                    category: 'international' },
  { id: 'tr-victory',          dateStart: '2026-08-30',                       nameCN: '胜利日(土耳其)',     nameEN: 'Victory Day (Turkey)',                         category: 'international', emoji: '🇹🇷' },
  { id: 'gb-summer-bank',      dateStart: '2026-08-31',                       nameCN: '英国夏季银行假日',   nameEN: 'Summer Bank Holiday (UK)',                     category: 'international', emoji: '🇬🇧' },
  { id: 'my-independence',     dateStart: '2026-08-31',                       nameCN: '马来西亚独立日',     nameEN: 'Malaysia National Day (Merdeka)',              category: 'international', emoji: '🇲🇾' },
  { id: 'tt-independence',     dateStart: '2026-08-31',                       nameCN: '特立尼达和多巴哥独立日', nameEN: 'Trinidad & Tobago Independence Day',       category: 'international' },
  { id: 'ph-heroes',           dateStart: '2026-08-31',                       nameCN: '全国英雄节(菲律宾)', nameEN: 'National Heroes Day (Philippines)',            category: 'international', emoji: '🇵🇭' },

  // ── 九月 ──────────────────────────────────────────────────────────────────
  { id: 'vn-national',         dateStart: '2026-09-02',                       nameCN: '越南国庆节',         nameEN: 'Vietnam National Day',                        category: 'international', emoji: '🇻🇳' },
  { id: 'us-labor',            dateStart: '2026-09-07',                       nameCN: '美国劳工节',         nameEN: 'US Labor Day',                                category: 'international', emoji: '🇺🇸' },
  { id: 'br-independence',     dateStart: '2026-09-07',                       nameCN: '巴西独立日',         nameEN: 'Brazil Independence Day',                     category: 'international', emoji: '🇧🇷' },
  { id: 'ca-labour',           dateStart: '2026-09-07',                       nameCN: '加拿大劳工节',       nameEN: 'Labour Day (Canada)',                          category: 'international', emoji: '🇨🇦' },
  { id: 'rel-rosh-hash',       dateStart: '2026-09-11', dateEnd: '2026-09-12', days: 2, nameCN: '犹太新年',  nameEN: 'Rosh Hashanah',                             category: 'religious', emoji: '✡️', religion: 'jewish' },
  { id: 'cr-independence',     dateStart: '2026-09-15',                       nameCN: '中美洲独立日(哥斯达黎加)', nameEN: 'Independence Day (Costa Rica)',          category: 'international' },
  { id: 'sv-independence',     dateStart: '2026-09-15',                       nameCN: '萨尔瓦多独立日',     nameEN: 'El Salvador Independence Day',                category: 'international' },
  { id: 'gt-independence',     dateStart: '2026-09-15',                       nameCN: '危地马拉独立日',     nameEN: 'Guatemala Independence Day',                  category: 'international' },
  { id: 'mx-independence',     dateStart: '2026-09-16',                       nameCN: '墨西哥独立日',       nameEN: 'Mexico Independence Day',                     category: 'international', emoji: '🇲🇽' },
  { id: 'my-malaysia-day',     dateStart: '2026-09-16',                       nameCN: '马来西亚日',         nameEN: 'Malaysia Day',                                category: 'international', emoji: '🇲🇾' },
  { id: 'cl-independence',     dateStart: '2026-09-18',                       nameCN: '智利独立日',         nameEN: 'Chile Independence Day',                      category: 'international' },
  { id: 'cl-army',             dateStart: '2026-09-19',                       nameCN: '军队荣耀日(智利)',   nameEN: 'Army Day (Chile)',                             category: 'international' },
  { id: 'rel-yom-kippur',      dateStart: '2026-09-20',                       nameCN: '赎罪日',             nameEN: 'Yom Kippur',                                  category: 'religious', emoji: '✡️', religion: 'jewish' },
  { id: 'jp-respect-aged',     dateStart: '2026-09-21',                       nameCN: '日本敬老日',         nameEN: 'Respect for the Aged Day (Japan)',             category: 'international', emoji: '🇯🇵' },
  { id: 'sa-national',         dateStart: '2026-09-23',                       nameCN: '沙特国庆日',         nameEN: 'Saudi National Day',                          category: 'international', emoji: '🇸🇦' },
  { id: 'kr-chuseok',          dateStart: '2026-09-24', dateEnd: '2026-09-26', days: 3, nameCN: '韩国中秋节(秋夕)', nameEN: 'Chuseok (Korean Thanksgiving)',        category: 'international', emoji: '🇰🇷' },
  { id: 'tt-republic',         dateStart: '2026-09-24',                       nameCN: '共和国日(特多)',     nameEN: 'Republic Day (Trinidad & Tobago)',             category: 'international' },
  { id: 'za-heritage',         dateStart: '2026-09-24',                       nameCN: '文化遗产日(南非)',   nameEN: 'Heritage Day (South Africa)',                  category: 'international', emoji: '🇿🇦' },
  { id: 'cn-mid-autumn',       dateStart: '2026-09-25',                       nameCN: '中秋节',             nameEN: 'Mid-Autumn Festival',                         category: 'china' },
  { id: 'rel-sukkot',          dateStart: '2026-09-25',                       nameCN: '住棚节',             nameEN: 'Sukkot',                                      category: 'religious', emoji: '✡️', religion: 'jewish' },
  { id: 'ca-reconciliation',   dateStart: '2026-09-30',                       nameCN: '加拿大原住民真相与和解日', nameEN: 'Truth & Reconciliation Day (Canada)',    category: 'international', emoji: '🇨🇦' },

  // ── 十月 ──────────────────────────────────────────────────────────────────
  { id: 'cn-national',         dateStart: '2026-10-01', dateEnd: '2026-10-07', days: 7, nameCN: '国庆节',    nameEN: 'National Day',                              category: 'china' },
  { id: 'in-gandhi',           dateStart: '2026-10-02',                       nameCN: '圣雄甘地纪念日',     nameEN: 'Gandhi Jayanti (India)',                       category: 'international', emoji: '🇮🇳' },
  { id: 'de-unity',            dateStart: '2026-10-03',                       nameCN: '德国统一日',         nameEN: 'German Unity Day',                            category: 'international', emoji: '🇩🇪' },
  { id: 'kr-gaecheon',         dateStart: '2026-10-03',                       nameCN: '韩国开天节',         nameEN: 'National Foundation Day (Korea)',              category: 'international', emoji: '🇰🇷' },
  { id: 'eg-armed-forces',     dateStart: '2026-10-06',                       nameCN: '武装力量日(埃及)',   nameEN: 'Armed Forces Day (Egypt)',                     category: 'international', emoji: '🇪🇬' },
  { id: 'kr-hangeul',          dateStart: '2026-10-09',                       nameCN: '韩文节',             nameEN: 'Hangeul Day (Korea)',                          category: 'international', emoji: '🇰🇷' },
  { id: 'jp-sports',           dateStart: '2026-10-12',                       nameCN: '日本体育节',         nameEN: 'Sports Day (Japan)',                           category: 'international', emoji: '🇯🇵' },
  { id: 'ca-thanksgiving',     dateStart: '2026-10-12',                       nameCN: '加拿大感恩节',       nameEN: 'Canadian Thanksgiving',                       category: 'international', emoji: '🇨🇦' },
  { id: 'es-national',         dateStart: '2026-10-12',                       nameCN: '西班牙国庆日',       nameEN: 'Spain National Day',                          category: 'international' },
  { id: 'gt-revolution',       dateStart: '2026-10-20',                       nameCN: '革命纪念日(危地马拉)', nameEN: 'Revolution Day (Guatemala)',                 category: 'international' },
  { id: 'in-dussehra',         dateStart: '2026-10-21',                       nameCN: '十胜节(达塞拉)',     nameEN: 'Dussehra / Vijayadashami (India)',             category: 'religious', emoji: '🇮🇳', religion: 'hinduism' },
  { id: 'tr-republic',         dateStart: '2026-10-29',                       nameCN: '土耳其共和国日',     nameEN: 'Republic Day (Turkey)',                        category: 'international', emoji: '🇹🇷' },
  { id: 'int-halloween',       dateStart: '2026-10-31',                       nameCN: '万圣节',             nameEN: 'Halloween',                                   category: 'international' },

  // ── 十一月 ────────────────────────────────────────────────────────────────
  { id: 'mx-dia-muertos',      dateStart: '2026-11-01', dateEnd: '2026-11-02', days: 2, nameCN: '亡灵节(墨西哥)', nameEN: 'Día de Muertos (Mexico)',              category: 'international', emoji: '🇲🇽' },
  { id: 'int-all-saints',      dateStart: '2026-11-01',                       nameCN: '诸圣节',             nameEN: "All Saints' Day",                             category: 'international' },
  { id: 'jp-culture',          dateStart: '2026-11-03',                       nameCN: '日本文化节',         nameEN: 'Culture Day (Japan)',                          category: 'international', emoji: '🇯🇵' },
  { id: 'pa-separation',       dateStart: '2026-11-03',                       nameCN: '巴拿马分离日',       nameEN: 'Separation Day (Panama)',                      category: 'international' },
  { id: 'in-diwali',           dateStart: '2026-11-08',                       nameCN: '排灯节(印度)',       nameEN: 'Diwali (India)',                               category: 'religious', emoji: '🇮🇳', religion: 'hinduism' },
  { id: 'us-veterans',         dateStart: '2026-11-11',                       nameCN: '美国退伍军人节',     nameEN: 'Veterans Day',                                category: 'international', emoji: '🇺🇸' },
  { id: 'int-armistice',       dateStart: '2026-11-11',                       nameCN: '停战纪念日',         nameEN: 'Remembrance Day / Armistice Day',              category: 'international' },
  { id: 'br-republic',         dateStart: '2026-11-15',                       nameCN: '巴西共和国宣言日',   nameEN: 'Republic Day (Brazil)',                        category: 'international', emoji: '🇧🇷' },
  { id: 'mx-revolution',       dateStart: '2026-11-16',                       nameCN: '墨西哥革命纪念日',   nameEN: 'Revolution Day (Mexico)',                      category: 'international', emoji: '🇲🇽' },
  { id: 'br-black-consciousness', dateStart: '2026-11-20',                    nameCN: '巴西黑人意识日',     nameEN: 'Black Consciousness Day (Brazil)',             category: 'international', emoji: '🇧🇷' },
  { id: 'jp-labour-thanks',    dateStart: '2026-11-23',                       nameCN: '日本勤劳感谢日',     nameEN: 'Labor Thanksgiving Day (Japan)',               category: 'international', emoji: '🇯🇵' },
  { id: 'us-thanksgiving',     dateStart: '2026-11-26',                       nameCN: '美国感恩节',         nameEN: 'Thanksgiving',                                category: 'international', emoji: '🇺🇸' },
  { id: 'us-black-friday',     dateStart: '2026-11-27',                       nameCN: '黑色星期五',         nameEN: 'Black Friday',                                category: 'international', emoji: '🇺🇸' },
  { id: 'pa-independence',     dateStart: '2026-11-28',                       nameCN: '巴拿马独立日',       nameEN: 'Panama Independence from Spain',               category: 'international' },
  { id: 'ph-bonifacio',        dateStart: '2026-11-30',                       nameCN: '波尼法西奥日(菲律宾)', nameEN: 'Bonifacio Day (Philippines)',               category: 'international', emoji: '🇵🇭' },

  // ── 十二月 ────────────────────────────────────────────────────────────────
  { id: 'ae-national',         dateStart: '2026-12-02', dateEnd: '2026-12-03', days: 2, nameCN: '阿联酋国庆日', nameEN: 'UAE National Day',                       category: 'international', emoji: '🇦🇪' },
  { id: 'rel-hanukkah',        dateStart: '2026-12-04',                       nameCN: '光明节',             nameEN: 'Hanukkah',                                    category: 'religious', emoji: '✡️', religion: 'jewish' },
  { id: 'es-constitution',     dateStart: '2026-12-06',                       nameCN: '西班牙宪法日',       nameEN: 'Spain Constitution Day',                      category: 'international' },
  { id: 'int-immaculate',      dateStart: '2026-12-08',                       nameCN: '圣母无染原罪节',     nameEN: 'Immaculate Conception',                       category: 'international' },
  { id: 'mx-guadalupe',        dateStart: '2026-12-12',                       nameCN: '瓜达卢佩圣母节(墨西哥)', nameEN: 'Our Lady of Guadalupe (Mexico)',           category: 'international', emoji: '🇲🇽' },
  { id: 'za-reconciliation',   dateStart: '2026-12-16',                       nameCN: '和解日(南非)',       nameEN: 'Day of Reconciliation (South Africa)',         category: 'international', emoji: '🇿🇦' },
  { id: 'int-christmas-eve',   dateStart: '2026-12-24',                       nameCN: '平安夜',             nameEN: 'Christmas Eve',                               category: 'international' },
  { id: 'int-christmas',       dateStart: '2026-12-25',                       nameCN: '圣诞节',             nameEN: 'Christmas Day',                               category: 'international' },
  { id: 'gb-boxing',           dateStart: '2026-12-26',                       nameCN: '节礼日(英联邦)',     nameEN: 'Boxing Day',                                  category: 'international', emoji: '🇬🇧' },
  { id: 'ca-boxing',           dateStart: '2026-12-26',                       nameCN: '节礼日(加拿大)',     nameEN: 'Boxing Day (Canada)',                          category: 'international', emoji: '🇨🇦' },
  { id: 'it-stephen',          dateStart: '2026-12-26',                       nameCN: '圣斯德望日(意大利)', nameEN: "St. Stephen's Day (Italy)",                    category: 'international', emoji: '🇮🇹' },
  { id: 'au-boxing',           dateStart: '2026-12-26',                       nameCN: '节礼日(澳大利亚)',   nameEN: 'Boxing Day (Australia)',                       category: 'international', emoji: '🇦🇺' },
  { id: 'ph-rizal',            dateStart: '2026-12-30',                       nameCN: '黎刹日(菲律宾)',     nameEN: 'Rizal Day (Philippines)',                      category: 'international', emoji: '🇵🇭' },
  { id: 'int-nye',             dateStart: '2026-12-31',                       nameCN: '跨年夜',             nameEN: "New Year's Eve",                              category: 'international' },
];

export const MONTH_NAMES_CN = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];

export const CATEGORY_LABEL: Record<HolidayCategory, string> = {
  china: '中国假日',
  international: '国际假日',
  religious: '宗教节日',
};

export const RELIGION_LABEL: Record<HolidayReligion, string> = {
  islam:    '伊斯兰教',
  jewish:   '犹太教',
  buddhism: '佛教',
  hinduism: '印度教',
};

export interface HolidayDetail {
  background: string;
  businessImpact: string;
  notes: string;
}

const HOLIDAY_DETAILS: Record<string, HolidayDetail> = {
  元旦: {
    background: '公历新年的第一天，是全球多数市场共同承认的公共假日。欧美客户通常会把它与圣诞、跨年假期连成一段年末休假周期。',
    businessImpact: '1月1日多数办公室关闭，12月底到1月初邮件回复率偏低。新年度预算、合同审批和排期通常在1月第一周后才逐步恢复。',
    notes: '可使用 Happy New Year 作为通用祝福。重要报价、付款确认和合同签署尽量避开12月28日至1月5日。注意区分公历新年和中国春节。',
  },
  国际新年: {
    background: '即公历1月1日新年，跨国客户普遍会有假日安排，也是年末假期后的新业务周期起点。',
    businessImpact: '全球大多数国家当天暂停办公，跨时区团队常出现自动回复和审批延迟。节后第一周适合做关系维护和新年度计划跟进。',
    notes: 'Happy New Year 适用于绝大多数客户。不要在对方跨年夜或元旦当天催促紧急回复，除非事先约定。',
  },
  春节: {
    background: '春节是中国及华人社群最重要的传统节日，核心是辞旧迎新、家庭团聚和拜年往来。节前返乡和节后复工会形成明显的人流与产能波动。',
    businessImpact: '法定假期约一周，但工厂、物流和供应商实际影响常覆盖节前两周到节后两周。报价、打样、订舱、出货和售后响应都可能放慢。',
    notes: '节前2-3周应完成关键订单确认和备货。正月初一到初七避免催单和谈判。可向华人客户发送“春节快乐”“新年快乐”等祝福。',
  },
  清明节: {
    background: '清明兼具节气和祭祖属性，常见活动是扫墓、追思先人和家庭短途出行，整体氛围偏安静肃穆。',
    businessImpact: '通常放假3天，制造和物流影响小于春节、国庆。部分客户或同事会返乡祭扫，短期回复可能放慢。',
    notes: '不建议说“清明节快乐”。更合适的表达是“清明安康”或保持正常业务沟通。避免在假日期间强催私人事务。',
  },
  劳动节: {
    background: '五一劳动节源于劳动者权益纪念，现已成为中国和许多国家的重要公共假期，也是春季消费和出行高峰。',
    businessImpact: '中国通常形成数天假期，工厂和货代会按假期安排暂停或减员。节前一周订单、报关和发货容易集中。',
    notes: '4月下旬应提前确认交期和订舱。节日期间可发送简短祝福，但紧急生产和出货需求应提前锁定。',
  },
  端午节: {
    background: '端午是中国传统节日，常见习俗包括吃粽子、赛龙舟和佩戴香囊，具有纪念与祈福的双重意味。',
    businessImpact: '通常放假3天，对工厂影响中等。节前礼品、食品包装、餐饮渠道会有需求波动，跨境业务主要受短假期影响。',
    notes: '可使用“端午安康”，比“端午快乐”更稳妥。节前确认样品、付款和物流节点，避免压到假期当天处理。',
  },
  中秋节: {
    background: '中秋节以赏月、团圆和月饼礼赠为核心，是华人社群重要的家庭节日和商务礼仪节点。',
    businessImpact: '通常放假1-3天，若与国庆相邻可能形成更长假期。节前月饼礼盒、食品包装和企业礼品需求明显上升。',
    notes: '“中秋快乐”“阖家团圆”均可使用。重要华人客户可提前安排合规礼品。若与国庆连休，按长假节奏规划出货。',
  },
  国庆节: {
    background: '中国国庆节纪念中华人民共和国成立，是全年最重要的公共假期之一，常与旅游、消费和家庭出行高峰叠加。',
    businessImpact: '国庆黄金周期间工厂、办公室、仓储和部分物流环节明显放慢。9月下旬常出现赶货高峰，节后产能恢复也需要数日。',
    notes: '建议9月中下旬前确认国庆前交货订单。节前赶货要加强质检。10月1日至7日期间避免要求紧急报价或临时排产。',
  },
  圣诞节: {
    background: '圣诞节是基督教传统节日，也已成为欧美和许多国际市场最重要的年末家庭、零售和礼品消费季。',
    businessImpact: '欧美客户通常从12月下旬进入休假模式，圣诞前后邮件回复和审批显著下降。面向零售渠道的货物通常需要在更早时间完成到仓。',
    notes: '对欧美客户可用 Merry Christmas 或 Happy Holidays。对宗教背景不明确的客户，Happy Holidays 更稳妥。关键商务事项建议12月中旬前推进。',
  },
  平安夜: {
    background: '平安夜是圣诞前夜，许多国家和公司会提前下班或进入家庭聚会安排。',
    businessImpact: '12月24日下午开始欧美邮件响应明显下降，仓库、快递和办公室可能提前关闭。',
    notes: '当天不适合推进紧急审批。祝福可使用 Christmas Eve greetings 或 Happy Holidays，语气保持轻松简短。',
  },
  跨年夜: {
    background: '跨年夜是公历新年前夜，全球多地有倒计时、聚会和烟花活动。',
    businessImpact: '12月31日下午开始回复率下降，部分国家公司提前结束办公。跨年后还会叠加元旦假期。',
    notes: '避免在当地晚间或假日前夕催促决策。可发送简短新年祝福，正式业务安排放到节后工作日。',
  },
  情人节: {
    background: '情人节是全球化程度很高的消费型节日，礼品、鲜花、珠宝、餐饮和营销活动集中。',
    businessImpact: '对一般B2B办公影响有限，但相关消费品客户会提前数周进入备货和促销周期。',
    notes: '商务邮件不必主动强调情人节，除非对方行业相关。营销类祝福应避免过度私人化。',
  },
  万圣节: {
    background: '万圣节在北美和部分欧洲市场具有强消费属性，服装、装饰、糖果、派对用品需求集中。',
    businessImpact: '假日本身通常不导致办公关闭，但相关零售订单季节性强，采购和出货窗口会提前。',
    notes: '面向欧美消费品客户可结合轻松营销。正式商务沟通保持专业，避免使用惊悚或冒犯性素材。',
  },
  感恩节: {
    background: '感恩节以家庭聚餐和表达感谢为核心，美国和加拿大日期不同，美国市场影响尤其明显。',
    businessImpact: '美国感恩节周四及其后周五常形成长周末，办公室、仓库和物流响应放慢。黑五促销从该节点启动。',
    notes: '可向美国客户表达感谢和节日问候。感恩节当天及周五避免要求快速审批，零售相关订单需更早完成入仓。',
  },
  美国感恩节: {
    background: '美国感恩节是美国最重要的家庭节日之一，通常与周末连成四天休假，并连接黑色星期五消费季。',
    businessImpact: '美国客户从周三下午开始回复变慢，周四基本停工，周五很多公司休假或只保留值班。港口、仓库和快递排期也可能拥堵。',
    notes: '可使用 Happy Thanksgiving。重要合同、付款和出货确认应在感恩节前一周完成，节后再跟进未回复事项。',
  },
  黑色星期五: {
    background: '黑色星期五是感恩节后的大型促销日，已从美国零售场景扩展到全球电商和品牌营销。',
    businessImpact: '消费品、电商、仓储和快递压力很高。价格促销、库存补货、退换货和客服工单会集中出现。',
    notes: '相关客户通常早已完成采购计划，临近当天再推新品价值有限。注意促销价格、库存承诺和交期承诺的一致性。',
  },
  复活节: {
    background: '复活节是基督教重要节日，在欧美、澳洲及部分拉美国家具有公共假期和家庭聚会属性。',
    businessImpact: '受难日到复活节周一常形成长周末，欧洲、英国、澳洲客户回复明显变慢，物流和银行处理可能顺延。',
    notes: '可使用 Happy Easter，但对宗教背景不明确的客户也可只说 holiday weekend。节前确认付款、提货和审批节点。',
  },
  耶稣受难日: {
    background: '耶稣受难日是复活节前的纪念日，在许多基督教文化地区为公共假日，氛围相对肃穆。',
    businessImpact: '欧美、澳洲、部分亚洲市场会放假或减员，银行和物流可能暂停。与复活节周末连休影响更明显。',
    notes: '不建议使用过于欢快的祝福。若需问候，可使用 wishing you a peaceful holiday weekend。',
  },
  复活节周一: {
    background: '复活节周一是复活节后的延续假日，在欧洲、英国、澳洲等市场较常见。',
    businessImpact: '许多办公室继续关闭，复活节后第一个工作日邮件积压较多。订单确认、付款和发运可能顺延。',
    notes: '安排欧洲客户会议时要避开复活节长周末。节后跟进邮件应留出缓冲时间。',
  },
  美国独立日: {
    background: '美国独立日纪念1776年独立宣言，是美国国家认同和夏季家庭聚会的重要节日。',
    businessImpact: '美国公司通常当天关闭，若靠近周末会形成长周末。物流、仓储和客户支持响应会放慢。',
    notes: '可使用 Happy Fourth of July。节日前后避免要求美国客户紧急审批，出货和交付需提前确认。',
  },
  美国劳工节: {
    background: '美国劳工节在9月第一个星期一，常被视为夏季结束和秋季业务周期开始的节点。',
    businessImpact: '美国市场形成三天周末，邮件回复、仓储和运输安排会延迟。节后学校开学和零售季节切换影响消费节奏。',
    notes: '避免在长周末前发送需当天确认的事项。节后适合恢复项目推进和秋季采购计划沟通。',
  },
  美国马丁路德金日: {
    background: '该节日纪念美国民权运动领袖马丁·路德·金，强调平等、公益和社区服务。',
    businessImpact: '美国联邦机构、银行和部分公司休假，付款清算和政府相关事项可能顺延。',
    notes: '商务沟通可保持正常专业语气，不宜做商业化促销。涉及美国客户的付款和文件提交需提前安排。',
  },
  美国总统日: {
    background: '美国总统日源自华盛顿诞辰纪念，如今常泛指对历任总统的纪念日。',
    businessImpact: '美国银行、政府机构和部分公司关闭，零售端可能有促销活动，普通B2B影响中等。',
    notes: '涉及美国银行付款、政府文件或客户审批时预留一天缓冲。普通问候无需过度强调。',
  },
  美国阵亡将士纪念日: {
    background: '该节日悼念为美国服役牺牲的军人，也是美国夏季消费和出行季的开始。',
    businessImpact: '美国形成三天长周末，办公室和仓储可能暂停。零售促销、户外用品和旅游消费较活跃。',
    notes: '节日带有纪念性质，祝福用语应克制。避免将其包装成纯促销节点。',
  },
  美国退伍军人节: {
    background: '退伍军人节向退役军人表达敬意，美国政府、银行和部分机构会休假。',
    businessImpact: '银行清算、政府服务和部分办公室响应会放慢，普通企业不一定全部停工。',
    notes: '与美国客户沟通时保持尊重，不宜使用轻佻表达。涉及银行业务要提前确认截止时间。',
  },
  美国黑人解放日: {
    background: '六月节纪念美国奴隶制结束的重要历史节点，近年成为美国联邦假日。',
    businessImpact: '美国政府、银行和越来越多企业会休假或减员，付款和审批可能顺延。',
    notes: '主题涉及历史平权，商务表达应保持尊重和克制，避免娱乐化使用。',
  },
  英国五月银行假日: {
    background: '英国银行假日是公共休息日，五月初假期常与春季出行和零售活动相关。',
    businessImpact: '英国办公室、银行和部分物流暂停，周末连休导致邮件回复延迟。',
    notes: '与英国客户安排会议、付款和提货时避开银行假日。可使用 bank holiday weekend 作为中性表达。',
  },
  英国春季银行假日: {
    background: '英国春季银行假日通常在5月底，连接春末夏初的家庭出行和休闲活动。',
    businessImpact: '英国市场形成长周末，银行、办公室、仓储和本地配送可能顺延。',
    notes: '提前确认英国客户的付款和交付日期。节后第一天避免过早催促复杂事项。',
  },
  英国夏季银行假日: {
    background: '英国夏季银行假日通常在8月底，是暑期结束前的重要长周末。',
    businessImpact: '英国客户休假集中，办公室和物流响应放慢，也可能叠加暑期年假。',
    notes: '8月英国客户整体休假较多，重要项目建议提前到7月下旬或9月初推进。',
  },
  节礼日: {
    background: '节礼日是圣诞节后的公共假日，在英国、加拿大、澳大利亚等英联邦市场较常见。',
    businessImpact: '办公室继续关闭，零售退换货、折扣销售和快递压力明显。圣诞假期影响通常延续到新年前后。',
    notes: '不要期待12月26日有正常商务响应。对英联邦客户可用 Happy Boxing Day，但通常 Happy Holidays 更通用。',
  },
  日本新年长假: {
    background: '日本新年是全年最重要的家庭节日之一，企业普遍在年末年初休业。',
    businessImpact: '日本客户常从12月底休到1月初，邮件、付款、报价和出货安排明显放慢。',
    notes: '12月下旬提前确认订单和付款。新年后可发送简短问候，避免假期内催促。',
  },
  日本黄金周: {
    background: '日本黄金周由多个公共假日连接而成，是日本全年最重要的长假之一。',
    businessImpact: '日本企业、物流和客户响应在4月底至5月初明显放慢，节前排期非常紧张。',
    notes: '对日业务应在4月中旬前确认样品、合同和出货。黄金周期间避免安排会议和紧急审批。',
  },
  韩国春节: {
    background: '韩国春节 Seollal 是重要家庭团聚节日，祭祖、拜年和返乡活动集中。',
    businessImpact: '韩国办公室和物流通常关闭数天，跨境沟通、付款和出货会延迟。',
    notes: '可向韩国客户发送新年问候。假期前完成确认事项，避免节日期间催促。',
  },
  韩国中秋节: {
    background: '韩国秋夕 Chuseok 是重要传统节日，以家庭团聚、祭祖和赠礼为核心。',
    businessImpact: '韩国市场通常连休数天，企业休假、物流减速和礼品需求集中。',
    notes: '节前两周确认交期和付款。可用 Happy Chuseok 向韩国客户问候。',
  },
  越南春节: {
    background: '越南春节 Tet 是越南全年最重要的传统节日，家庭团聚、拜年和返乡出行集中。',
    businessImpact: '越南工厂和办公室停工时间可能超过法定假期，节前赶货和节后复工放慢明显。',
    notes: '对越南供应链需提前确认生产计划和物流。节日期间避免催单，可发送 Tet 祝福。',
  },
  巴西狂欢节: {
    background: '巴西狂欢节是全球知名的大型文化节庆，游行、音乐和旅游活动集中。',
    businessImpact: '巴西企业和公共服务在狂欢节期间明显放慢，实际影响可能覆盖节前后数日。',
    notes: '对巴西客户应提前安排付款、文件和出货确认。节日期间避免要求快速回复。',
  },
  开斋节: {
    background: '开斋节标志斋月结束，是穆斯林社群最重要的节日之一，家庭聚会、礼拜和互赠礼物常见。',
    businessImpact: '中东、东南亚、南亚等穆斯林市场会放假数天，政府、银行、物流和客户回复都会放慢。',
    notes: '可使用 Eid Mubarak。节前最后几天和节日期间避免催促，斋月后期也要考虑工作时间缩短。',
  },
  宰牲节: {
    background: '宰牲节是伊斯兰重要节日，与朝觐和家庭慈善传统相关，在穆斯林国家影响广泛。',
    businessImpact: '许多穆斯林市场会连休数天，银行、政府、港口和物流排班可能调整。',
    notes: '可使用 Eid Mubarak。对中东客户的付款、清关和文件审批需提前完成。',
  },
  斋月开始: {
    background: '斋月是伊斯兰历中穆斯林斋戒、祈祷和家庭聚会的重要月份，日间饮食和工作节奏会调整。',
    businessImpact: '穆斯林市场工作时间常缩短，下午回复率下降，斋月后期临近开斋节影响更明显。',
    notes: '沟通安排尽量放在当地上午。避免安排午餐会议或催促对方在傍晚前快速处理复杂事项。',
  },
  伊斯兰新年: {
    background: '伊斯兰新年标志伊斯兰历新周期开始，在部分穆斯林国家为公共假日。',
    businessImpact: '影响因国家而异，政府、银行和部分企业可能休假或缩短办公。',
    notes: '对穆斯林客户可表达祝愿，但语气保持庄重。提前确认当地是否放假。',
  },
  先知诞辰: {
    background: '先知诞辰纪念伊斯兰先知穆罕默德诞辰，在许多穆斯林地区有宗教活动和公共假日安排。',
    businessImpact: '部分中东、北非和亚洲穆斯林市场会休假，公共机构和银行处理顺延。',
    notes: '节日带有宗教意义，避免商业化表达。可用简短尊重的问候。',
  },
  逾越节: {
    background: '逾越节是犹太教重要节日，纪念出埃及传统，家庭晚餐和宗教礼仪集中。',
    businessImpact: '以色列及犹太客户可能长时间休假或缩短办公，邮件和审批会延迟。',
    notes: '对犹太客户可使用 Happy Passover。避免安排节日晚间会议，注意饮食和宗教礼仪敏感性。',
  },
  犹太新年: {
    background: '犹太新年是犹太历新年，强调反思、祝福和家庭聚会。',
    businessImpact: '以色列和犹太客户通常休假，部分节日前后还会连接其他犹太节日，影响持续数日。',
    notes: '可用 Shana Tova 表达祝福。重要会议、合同和付款应避开节日日期。',
  },
  赎罪日: {
    background: '赎罪日是犹太教最肃穆的节日之一，以禁食、祈祷和反思为核心。',
    businessImpact: '以色列市场几乎全面停摆，犹太客户通常不处理商务沟通。',
    notes: '不适合发送节日快乐类祝福。避免在当天安排会议、催款或要求回复。',
  },
  光明节: {
    background: '光明节是犹太传统节日，以点烛、家庭聚会和礼物交换为特色。',
    businessImpact: '通常不如犹太新年和赎罪日影响办公，但相关客户晚间和家庭活动较多。',
    notes: '可使用 Happy Hanukkah。正式商务安排仍应确认对方工作日历。',
  },
  普珥节: {
    background: '普珥节是犹太传统节日，常见庆祝方式包括诵读经卷、赠送食物和慈善。',
    businessImpact: '对以色列及犹太客户有一定影响，但通常短于犹太新年等高圣日。',
    notes: '可发送轻松问候，但不要假设所有犹太客户都会停工。会议安排先确认。',
  },
  七七节: {
    background: '七七节 Shavuot 是犹太教重要节日，与律法传统和收获季相关。',
    businessImpact: '以色列客户和犹太机构可能休假，审批、付款和邮件回复顺延。',
    notes: '避免安排重要会议。对犹太客户保持尊重问候即可。',
  },
  住棚节: {
    background: '住棚节是犹太传统节期，纪念旷野旅居并带有收获感恩含义。',
    businessImpact: '假期可能持续多日，以色列市场和犹太客户的工作节奏会明显放慢。',
    notes: '节日前后避免紧急催促，重要事项提前完成确认。',
  },
  胡里节: {
    background: '胡里节是印度及印度教社群重要节日，以色彩庆祝春天、胜利和团聚。',
    businessImpact: '印度市场部分地区休假，客户可能参加庆祝活动，回复延迟。相关彩粉、节庆用品和服饰需求提前释放。',
    notes: '可使用 Happy Holi。避免在当天安排正式视频会议或紧急审批。',
  },
  排灯节: {
    background: '排灯节是印度教及南亚社群最重要节日之一，象征光明战胜黑暗，家庭聚会、点灯和礼品往来集中。',
    businessImpact: '印度市场会出现较长节庆周期，办公室、工厂、银行和物流均可能放慢，礼品和消费品需求旺盛。',
    notes: '可使用 Happy Diwali。对印度客户建议提前确认交期和付款，节日期间避免催促。',
  },
  十胜节: {
    background: '十胜节是印度教重要节日，象征正义战胜邪恶，在印度各地有不同庆祝方式。',
    businessImpact: '印度部分地区放假，节前后可能连接排灯节采购和家庭出行需求。',
    notes: '可发送简短祝福。不同邦假期安排差异大，需按客户所在地确认。',
  },
  大宝森节: {
    background: '大宝森节是南印度和东南亚印度教社群的重要节日，马来西亚、新加坡等地有大型宗教活动。',
    businessImpact: '相关地区部分企业和公共服务可能休假或交通拥堵，客户响应略有延迟。',
    notes: '节日宗教色彩强，祝福应尊重克制。安排马来西亚客户会议前确认当地假期。',
  },
  卫塞节: {
    background: '卫塞节纪念佛陀诞生、成道和涅槃，是佛教国家和社群的重要宗教节日。',
    businessImpact: '斯里兰卡、泰国、新加坡、马来西亚等市场可能休假，公共服务和客户回复放慢。',
    notes: '可使用 Vesak greetings 或保持正常问候。避免过度商业化和娱乐化。',
  },
  佛诞节: {
    background: '佛诞节纪念佛陀诞生，在韩国及佛教社群有灯会、礼佛和家庭活动。',
    businessImpact: '相关市场可能放假一天，客户回复和政府服务会顺延。',
    notes: '保持尊重语气即可。对韩国客户安排交期时留出假日缓冲。',
  },
};

function normalizeHolidayName(name: string): string {
  return name
    .replace(/[（(].*?[）)]/g, '')
    .replace(/·.*$/g, '')
    .trim();
}

function inferRegionLabel(holiday: Holiday): string {
  if (holiday.emoji) return `${holiday.emoji} 所在市场`;
  if (holiday.category === 'china') return '中国市场';
  if (holiday.religion) return RELIGION_LABEL[holiday.religion] + '相关市场';

  const regionByPrefix: Array<[string[], string]> = [
    [['us-'], '美国市场'],
    [['gb-'], '英国市场'],
    [['ca-'], '加拿大市场'],
    [['jp-'], '日本市场'],
    [['kr-'], '韩国市场'],
    [['in-'], '印度市场'],
    [['sg-','my-','th-','vn-','id-','ph-'], '东南亚市场'],
    [['tr-','ae-','sa-','eg-','ir-'], '中东及周边市场'],
    [['de-','fr-','it-','es-','nl-','ru-'], '欧洲市场'],
    [['br-','mx-','ar-','cl-','uy-','pe-','co-','cr-','sv-','gt-','pa-','pr-','do-','tt-','ec-'], '美洲市场'],
  ];

  for (const [prefixes, label] of regionByPrefix) {
    if (prefixes.some((prefix) => holiday.id.startsWith(prefix))) return label;
  }
  return '相关市场';
}

function getGenericDetail(holiday: Holiday): HolidayDetail {
  const region = inferRegionLabel(holiday);
  const name = holiday.nameCN;

  if (holiday.category === 'religious') {
    return {
      background: `${name}属于${holiday.religion ? RELIGION_LABEL[holiday.religion] : '宗教'}节日，通常与礼拜、家庭聚会、慈善或传统仪式相关，具体日期和放假安排因国家与教派而异。`,
      businessImpact: `${region}可能出现办公室休假、工作时间缩短或回复延迟。涉及付款、清关、出货和会议安排时，应按客户所在地日历提前确认。`,
      notes: '宗教节日沟通要保持尊重，避免玩笑化、商业化或过度促销表达。若不确定对方是否庆祝，可使用中性问候或只按正常业务沟通。',
    };
  }

  if (holiday.nameCN.includes('独立日') || holiday.nameCN.includes('国庆') || holiday.nameCN.includes('共和国') || holiday.nameCN.includes('宪法') || holiday.nameCN.includes('解放') || holiday.nameCN.includes('革命') || holiday.nameCN.includes('胜利')) {
    return {
      background: `${name}是${region}的重要国家纪念日，通常与国家历史、独立、宪政或公共纪念活动相关。`,
      businessImpact: `${region}的政府机构、银行、办公室和部分物流服务可能暂停或减员。若假日连接周末，实际影响会扩展到前后工作日。`,
      notes: '国家纪念日宜使用克制、尊重的问候。涉及当地付款、证书、清关、订舱和客户审批时，建议至少提前1-2个工作日确认。',
    };
  }

  if (holiday.category === 'china') {
    return {
      background: `${name}是中国公共假日或传统节日，通常会影响办公室、工厂、物流和客户回复节奏。`,
      businessImpact: '节前常出现订单、付款和发货集中处理，节日期间响应放慢，节后需要时间消化积压邮件和生产排程。',
      notes: '提前确认交期、付款和物流安排。给华人客户发送简短、得体的中文祝福通常有助于关系维护。',
    };
  }

  return {
    background: `${name}是${region}常见公共假日或社会文化节日，可能与家庭聚会、公共纪念、消费活动或本地传统相关。`,
    businessImpact: `${region}客户的办公、银行、仓储和本地配送可能在节日前后放慢。跨境项目要额外确认当地是否调休或形成长周末。`,
    notes: '不熟悉节日含义时，建议使用中性问候并避免夸张营销。重要业务事项应提前确认负责人、截止时间和备用联系人。',
  };
}

export function getHolidayDetail(holiday: Holiday): HolidayDetail {
  const normalizedName = normalizeHolidayName(holiday.nameCN);
  return HOLIDAY_DETAILS[holiday.nameCN]
    ?? HOLIDAY_DETAILS[normalizedName]
    ?? HOLIDAY_DETAILS[holiday.nameEN]
    ?? getGenericDetail(holiday);
}

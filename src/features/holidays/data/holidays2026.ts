export type HolidayCategory = 'china' | 'international' | 'religious';

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
  { id: 'my-thaipusam',        dateStart: '2026-02-01',                       nameCN: '大宝森节',           nameEN: 'Thaipusam',                                   category: 'religious', emoji: '🇲🇾' },
  { id: 'mx-constitution',     dateStart: '2026-02-02',                       nameCN: '墨西哥宪法纪念日',   nameEN: 'Constitution Day (Mexico)',                    category: 'international', emoji: '🇲🇽' },
  { id: 'jp-foundation',       dateStart: '2026-02-11',                       nameCN: '日本建国纪念日',     nameEN: 'National Foundation Day (Japan)',              category: 'international', emoji: '🇯🇵' },
  { id: 'int-valentine',       dateStart: '2026-02-14',                       nameCN: '情人节',             nameEN: "Valentine's Day",                             category: 'international' },
  { id: 'cn-spring',           dateStart: '2026-02-15', dateEnd: '2026-02-21', days: 7, nameCN: '春节',       nameEN: 'Chinese New Year',                          category: 'china' },
  { id: 'vn-tet',              dateStart: '2026-02-15', dateEnd: '2026-02-19', days: 5, nameCN: '越南春节(Tết)', nameEN: 'Vietnamese New Year (Tet)',              category: 'international', emoji: '🇻🇳' },
  { id: 'us-presidents',       dateStart: '2026-02-16',                       nameCN: '美国总统日',         nameEN: "Presidents' Day",                             category: 'international', emoji: '🇺🇸' },
  { id: 'kr-seollal',          dateStart: '2026-02-16', dateEnd: '2026-02-18', days: 3, nameCN: '韩国春节(元旦)', nameEN: 'Korean New Year (Seollal)',              category: 'international', emoji: '🇰🇷' },
  { id: 'br-carnaval',         dateStart: '2026-02-16', dateEnd: '2026-02-17', days: 2, nameCN: '巴西狂欢节', nameEN: 'Brazilian Carnaval',                        category: 'international', emoji: '🇧🇷' },
  { id: 'ca-family',           dateStart: '2026-02-16',                       nameCN: '加拿大家庭日',       nameEN: 'Family Day (Canada)',                          category: 'international', emoji: '🇨🇦' },
  { id: 'rel-ramadan',         dateStart: '2026-02-18',                       nameCN: '斋月开始',           nameEN: 'Ramadan Begins',                              category: 'religious', emoji: '☪️' },
  { id: 'sa-founding',         dateStart: '2026-02-22',                       nameCN: '沙特建国纪念日',     nameEN: 'Saudi Founding Day',                          category: 'international', emoji: '🇸🇦' },
  { id: 'jp-emperor',          dateStart: '2026-02-23',                       nameCN: '天皇诞辰(日本)',     nameEN: "Emperor's Birthday (Japan)",                  category: 'international', emoji: '🇯🇵' },
  { id: 'do-independence',     dateStart: '2026-02-27',                       nameCN: '多米尼加独立日',     nameEN: 'Dominican Republic Independence Day',          category: 'international' },

  // ── 三月 ──────────────────────────────────────────────────────────────────
  { id: 'kr-independence',     dateStart: '2026-03-01',                       nameCN: '韩国三一节',         nameEN: 'Independence Movement Day (Korea)',            category: 'international', emoji: '🇰🇷' },
  { id: 'in-holi',             dateStart: '2026-03-03',                       nameCN: '胡里节(洒红节)',     nameEN: 'Holi (India)',                                category: 'religious', emoji: '🇮🇳' },
  { id: 'rel-purim',           dateStart: '2026-03-03',                       nameCN: '普珥节',             nameEN: 'Purim',                                       category: 'religious', emoji: '✡️' },
  { id: 'int-womens',          dateStart: '2026-03-08',                       nameCN: '国际妇女节',         nameEN: "International Women's Day",                   category: 'international' },
  { id: 'mx-juarez',           dateStart: '2026-03-16',                       nameCN: '华雷斯诞辰纪念日(墨西哥)', nameEN: "Benito Juárez's Birthday (Mexico)",     category: 'international', emoji: '🇲🇽' },
  { id: 'id-nyepi',            dateStart: '2026-03-19',                       nameCN: '宁静日·印尼新年(Nyepi)', nameEN: 'Nyepi - Balinese New Year (Indonesia)',  category: 'religious', emoji: '🇮🇩' },
  { id: 'rel-eid-fitr',        dateStart: '2026-03-20', dateEnd: '2026-03-22', days: 3, nameCN: '开斋节',    nameEN: 'Eid al-Fitr',                               category: 'religious', emoji: '☪️' },
  { id: 'ir-nowruz',           dateStart: '2026-03-20',                       nameCN: '诺鲁孜节(波斯新年)', nameEN: 'Nowruz (Persian New Year)',                   category: 'international', emoji: '🇮🇷' },
  { id: 'za-human-rights',     dateStart: '2026-03-21',                       nameCN: '南非人权日',         nameEN: 'Human Rights Day (South Africa)',              category: 'international', emoji: '🇿🇦' },
  { id: 'pr-emancipation',     dateStart: '2026-03-22',                       nameCN: '废奴纪念日(波多黎各)', nameEN: 'Emancipation Day (Puerto Rico)',             category: 'international' },
  { id: 'ar-memory',           dateStart: '2026-03-24',                       nameCN: '全国记忆日(阿根廷)', nameEN: 'National Memory Day (Argentina)',              category: 'international' },

  // ── 四月 ──────────────────────────────────────────────────────────────────
  { id: 'rel-passover',        dateStart: '2026-04-01',                       nameCN: '逾越节',             nameEN: 'Passover (Pesach)',                            category: 'religious', emoji: '✡️' },
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
  { id: 'rel-shavuot',         dateStart: '2026-05-21',                       nameCN: '七七节',             nameEN: 'Shavuot',                                     category: 'religious', emoji: '✡️' },
  { id: 'ec-pichincha',        dateStart: '2026-05-24',                       nameCN: '皮钦查战役纪念日(厄瓜多尔)', nameEN: 'Battle of Pichincha (Ecuador)',        category: 'international' },
  { id: 'kr-buddha',           dateStart: '2026-05-24',                       nameCN: '佛诞节(韩国)',       nameEN: "Buddha's Birthday (Korea)",                   category: 'religious', emoji: '🇰🇷' },
  { id: 'us-memorial',         dateStart: '2026-05-25',                       nameCN: '美国阵亡将士纪念日', nameEN: 'Memorial Day',                                category: 'international', emoji: '🇺🇸' },
  { id: 'gb-spring-bank',      dateStart: '2026-05-25',                       nameCN: '英国春季银行假日',   nameEN: 'Spring Bank Holiday (UK)',                     category: 'international', emoji: '🇬🇧' },
  { id: 'de-whit-mon',         dateStart: '2026-05-25',                       nameCN: '圣灵降临节(德国)',   nameEN: 'Whit Monday (DE)',                             category: 'international', emoji: '🇩🇪' },
  { id: 'ar-may-revolution',   dateStart: '2026-05-25',                       nameCN: '五月革命纪念日(阿根廷)', nameEN: 'May Revolution Day (Argentina)',           category: 'international' },
  { id: 'fr-whit-mon',         dateStart: '2026-05-25',                       nameCN: '圣灵降临节(法国)',   nameEN: 'Whit Monday (France)',                         category: 'international', emoji: '🇫🇷' },
  { id: 'nl-whit-mon',         dateStart: '2026-05-25',                       nameCN: '圣灵降临节(荷兰)',   nameEN: 'Whit Monday (Netherlands)',                    category: 'international' },
  { id: 'rel-eid-adha',        dateStart: '2026-05-27', dateEnd: '2026-05-29', days: 3, nameCN: '宰牲节',    nameEN: 'Eid al-Adha',                               category: 'religious', emoji: '☪️' },
  { id: 'rel-vesak',           dateStart: '2026-05-31',                       nameCN: '卫塞节(佛诞)',       nameEN: 'Vesak / Buddha Day',                          category: 'religious', emoji: '☸️' },

  // ── 六月 ──────────────────────────────────────────────────────────────────
  { id: 'id-pancasila',        dateStart: '2026-06-01',                       nameCN: '建国五基日(印尼)',   nameEN: 'Pancasila Day (Indonesia)',                    category: 'international', emoji: '🇮🇩' },
  { id: 'my-agong',            dateStart: '2026-06-01',                       nameCN: '最高元首诞辰(马来西亚)', nameEN: "Yang di-Pertuan Agong's Birthday (Malaysia)", category: 'international', emoji: '🇲🇾' },
  { id: 'it-republic',         dateStart: '2026-06-02',                       nameCN: '意大利共和国日',     nameEN: 'Italian Republic Day',                        category: 'international', emoji: '🇮🇹' },
  { id: 'br-corpus-christi',   dateStart: '2026-06-04',                       nameCN: '基督圣体节(巴西)',   nameEN: 'Corpus Christi (Brazil)',                      category: 'international', emoji: '🇧🇷' },
  { id: 'au-kings-bday',       dateStart: '2026-06-08',                       nameCN: '国王诞辰日(澳大利亚)', nameEN: "King's Birthday (Australia)",               category: 'international', emoji: '🇦🇺' },
  { id: 'ru-russia-day',       dateStart: '2026-06-12',                       nameCN: '俄罗斯国庆日',       nameEN: 'Russia Day',                                  category: 'international', emoji: '🇷🇺' },
  { id: 'ph-independence',     dateStart: '2026-06-12',                       nameCN: '菲律宾独立日',       nameEN: 'Philippines Independence Day',                category: 'international', emoji: '🇵🇭' },
  { id: 'rel-islamic-ny',      dateStart: '2026-06-16',                       nameCN: '伊斯兰新年',         nameEN: 'Islamic New Year (Hijri)',                     category: 'religious', emoji: '☪️' },
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
  { id: 'rel-mawlid',          dateStart: '2026-08-25',                       nameCN: '先知诞辰(圣纪)',     nameEN: 'Mawlid al-Nabi',                              category: 'religious', emoji: '☪️' },
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
  { id: 'rel-rosh-hash',       dateStart: '2026-09-11', dateEnd: '2026-09-12', days: 2, nameCN: '犹太新年',  nameEN: 'Rosh Hashanah',                             category: 'religious', emoji: '✡️' },
  { id: 'cr-independence',     dateStart: '2026-09-15',                       nameCN: '中美洲独立日(哥斯达黎加)', nameEN: 'Independence Day (Costa Rica)',          category: 'international' },
  { id: 'sv-independence',     dateStart: '2026-09-15',                       nameCN: '萨尔瓦多独立日',     nameEN: 'El Salvador Independence Day',                category: 'international' },
  { id: 'gt-independence',     dateStart: '2026-09-15',                       nameCN: '危地马拉独立日',     nameEN: 'Guatemala Independence Day',                  category: 'international' },
  { id: 'mx-independence',     dateStart: '2026-09-16',                       nameCN: '墨西哥独立日',       nameEN: 'Mexico Independence Day',                     category: 'international', emoji: '🇲🇽' },
  { id: 'my-malaysia-day',     dateStart: '2026-09-16',                       nameCN: '马来西亚日',         nameEN: 'Malaysia Day',                                category: 'international', emoji: '🇲🇾' },
  { id: 'cl-independence',     dateStart: '2026-09-18',                       nameCN: '智利独立日',         nameEN: 'Chile Independence Day',                      category: 'international' },
  { id: 'cl-army',             dateStart: '2026-09-19',                       nameCN: '军队荣耀日(智利)',   nameEN: 'Army Day (Chile)',                             category: 'international' },
  { id: 'rel-yom-kippur',      dateStart: '2026-09-20',                       nameCN: '赎罪日',             nameEN: 'Yom Kippur',                                  category: 'religious', emoji: '✡️' },
  { id: 'jp-respect-aged',     dateStart: '2026-09-21',                       nameCN: '日本敬老日',         nameEN: 'Respect for the Aged Day (Japan)',             category: 'international', emoji: '🇯🇵' },
  { id: 'sa-national',         dateStart: '2026-09-23',                       nameCN: '沙特国庆日',         nameEN: 'Saudi National Day',                          category: 'international', emoji: '🇸🇦' },
  { id: 'kr-chuseok',          dateStart: '2026-09-24', dateEnd: '2026-09-26', days: 3, nameCN: '韩国中秋节(秋夕)', nameEN: 'Chuseok (Korean Thanksgiving)',        category: 'international', emoji: '🇰🇷' },
  { id: 'tt-republic',         dateStart: '2026-09-24',                       nameCN: '共和国日(特多)',     nameEN: 'Republic Day (Trinidad & Tobago)',             category: 'international' },
  { id: 'za-heritage',         dateStart: '2026-09-24',                       nameCN: '文化遗产日(南非)',   nameEN: 'Heritage Day (South Africa)',                  category: 'international', emoji: '🇿🇦' },
  { id: 'cn-mid-autumn',       dateStart: '2026-09-25',                       nameCN: '中秋节',             nameEN: 'Mid-Autumn Festival',                         category: 'china' },
  { id: 'rel-sukkot',          dateStart: '2026-09-25',                       nameCN: '住棚节',             nameEN: 'Sukkot',                                      category: 'religious', emoji: '✡️' },
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
  { id: 'in-dussehra',         dateStart: '2026-10-21',                       nameCN: '十胜节(达塞拉)',     nameEN: 'Dussehra / Vijayadashami (India)',             category: 'religious', emoji: '🇮🇳' },
  { id: 'tr-republic',         dateStart: '2026-10-29',                       nameCN: '土耳其共和国日',     nameEN: 'Republic Day (Turkey)',                        category: 'international', emoji: '🇹🇷' },
  { id: 'int-halloween',       dateStart: '2026-10-31',                       nameCN: '万圣节',             nameEN: 'Halloween',                                   category: 'international' },

  // ── 十一月 ────────────────────────────────────────────────────────────────
  { id: 'mx-dia-muertos',      dateStart: '2026-11-01', dateEnd: '2026-11-02', days: 2, nameCN: '亡灵节(墨西哥)', nameEN: 'Día de Muertos (Mexico)',              category: 'international', emoji: '🇲🇽' },
  { id: 'int-all-saints',      dateStart: '2026-11-01',                       nameCN: '诸圣节',             nameEN: "All Saints' Day",                             category: 'international' },
  { id: 'jp-culture',          dateStart: '2026-11-03',                       nameCN: '日本文化节',         nameEN: 'Culture Day (Japan)',                          category: 'international', emoji: '🇯🇵' },
  { id: 'pa-separation',       dateStart: '2026-11-03',                       nameCN: '巴拿马分离日',       nameEN: 'Separation Day (Panama)',                      category: 'international' },
  { id: 'in-diwali',           dateStart: '2026-11-08',                       nameCN: '排灯节(印度)',       nameEN: 'Diwali (India)',                               category: 'religious', emoji: '🇮🇳' },
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
  { id: 'rel-hanukkah',        dateStart: '2026-12-04',                       nameCN: '光明节',             nameEN: 'Hanukkah',                                    category: 'religious', emoji: '✡️' },
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

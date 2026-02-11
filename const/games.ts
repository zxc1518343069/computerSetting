// --- Image Helpers ---
const getSteamImg = (appId: number) =>
    `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;

export const INITIAL_ONLINE_GAMES = [
    {
        id: 1,
        name: '英雄联盟 (League of Legends)',
        icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/League_of_Legends_2019_vector.svg/1200px-League_of_Legends_2019_vector.svg.png',
        type: 'custom',
    },
    { id: 2, name: '反恐精英 2 (CS2)', icon: getSteamImg(730), type: 'steam' },
    {
        id: 3,
        name: '无畏契约 (Valorant)',
        icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Valorant_logo_-_pink_color_version.svg/1200px-Valorant_logo_-_pink_color_version.svg.png',
        type: 'custom',
    },
    { id: 4, name: '绝地求生 (PUBG)', icon: getSteamImg(578080), type: 'steam' },
    { id: 5, name: 'Dota 2', icon: getSteamImg(570), type: 'steam' },
    { id: 6, name: 'Apex 英雄', icon: getSteamImg(1172470), type: 'steam' },
    { id: 7, name: '永劫无间', icon: getSteamImg(240720), type: 'steam' },
    { id: 8, name: '守望先锋 2', icon: getSteamImg(2357570), type: 'steam' },
    {
        id: 9,
        name: '堡垒之夜 (Fortnite)',
        icon: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Fortnite_F_lettermark_logo.png',
        type: 'custom',
    },
    { id: 10, name: '原神', icon: getSteamImg(2358720), type: 'steam' },
    { id: 11, name: '使命召唤：现代战争 III', icon: getSteamImg(2355180), type: 'steam' },
    { id: 12, name: 'GTA 在线模式', icon: getSteamImg(271590), type: 'steam' },
    { id: 13, name: '彩虹六号：围攻', icon: getSteamImg(359550), type: 'steam' },
    { id: 14, name: '命运 2 (Destiny 2)', icon: getSteamImg(1085660), type: 'steam' },
    { id: 15, name: '战雷 (War Thunder)', icon: getSteamImg(236390), type: 'steam' },
    { id: 16, name: '星际战甲 (Warframe)', icon: getSteamImg(230410), type: 'steam' },
    { id: 17, name: 'Rust', icon: getSteamImg(252490), type: 'steam' },
    { id: 18, name: '军团要塞 2', icon: getSteamImg(440), type: 'steam' },
    { id: 19, name: 'Dead by Daylight', icon: getSteamImg(381210), type: 'steam' },
    { id: 20, name: '幻兽帕鲁 (Palworld)', icon: getSteamImg(1623730), type: 'steam' },
];

export const INITIAL_SINGLE_GAMES = [
    {
        id: 101,
        name: '黑神话：悟空',
        icon: 'https://upload.wikimedia.org/wikipedia/zh/a/a3/Black_Myth_Wukong_cover_art.jpg',
        type: 'custom',
    },
    { id: 102, name: '艾尔登法环 (Elden Ring)', icon: getSteamImg(1245620), type: 'steam' },
    { id: 103, name: '赛博朋克 2077', icon: getSteamImg(1091500), type: 'steam' },
    { id: 104, name: '巫师 3：狂猎', icon: getSteamImg(292030), type: 'steam' },
    { id: 105, name: '博德之门 3', icon: getSteamImg(1086940), type: 'steam' },
    { id: 106, name: '荒野大镖客 2', icon: getSteamImg(1174180), type: 'steam' },
    { id: 107, name: '战神 (God of War)', icon: getSteamImg(1593500), type: 'steam' },
    { id: 108, name: '只狼：影逝二度', icon: getSteamImg(814380), type: 'steam' },
    { id: 109, name: '生化危机 4 重制版', icon: getSteamImg(2050650), type: 'steam' },
    { id: 110, name: '霍格沃茨之遗', icon: getSteamImg(990080), type: 'steam' },
    { id: 111, name: '星空 (Starfield)', icon: getSteamImg(1716740), type: 'steam' },
    { id: 112, name: '最后生还者 第一部', icon: getSteamImg(1888930), type: 'steam' },
    { id: 113, name: '漫威蜘蛛侠：重制版', icon: getSteamImg(1817070), type: 'steam' },
    { id: 114, name: '女神异闻录 5 皇家版', icon: getSteamImg(1687950), type: 'steam' },
    { id: 115, name: '怪物猎人：世界', icon: getSteamImg(582010), type: 'steam' },
    { id: 116, name: '文明 6', icon: getSteamImg(289070), type: 'steam' },
    { id: 117, name: '星露谷物语', icon: getSteamImg(413150), type: 'steam' },
    { id: 118, name: '泰拉瑞亚', icon: getSteamImg(105600), type: 'steam' },
    { id: 119, name: '哈迪斯 (Hades)', icon: getSteamImg(1145360), type: 'steam' },
    { id: 120, name: '空洞骑士', icon: getSteamImg(367520), type: 'steam' },
];

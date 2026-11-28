// A book is an independent narrative; turning a page never switches books.
export const BOOKS = [
  {id:'starlight',title:'把星星带回家',summary:'一颗落下的星星，和一盏留给你的灯。',tone:'rose',pages:[
    {scene:'castle',title:'门口的小小身影',description:'公主回到城堡时，猫咪已经在门口等了很久。它没有催，只把身旁的位置让了出来。',wash:'#eee6c4'},
    {scene:'star',title:'星星掉下来了',description:'一颗星星滑过屋顶，落向花园。猫咪跳起来接住它，爪子里多了一点暖暖的光。',wash:'#e8e4c4'},
    {scene:'hug',title:'比星光更暖一点',description:'公主把星星收进小灯，又抱起追得气喘吁吁的猫咪。它在她怀里，终于安静下来。',wash:'#efe0c2'},
    {scene:'goodnight',title:'留一盏灯，明天再见',description:'那盏小灯被留在窗边。城堡慢慢安静下来，猫咪靠着公主睡着了，星星替它们守了一夜。',wash:'#e5dfbe',night:true}
  ]},
  {id:'borrowed-sunshine',title:'借你一半晴天',summary:'雨没有停，但回家的路变短了。',tone:'sage',pages:[
    {scene:'rain',phase:0,title:'出门时，还没有下雨',description:'公主刚走到花园，雨就落了下来。城堡门开了一条缝，一只猫正拖着比自己还大的伞。',wash:'#e1e4d2'},
    {scene:'rain',phase:1,title:'伞悄悄歪过去一点',description:'猫咪把伞往公主那边推。她发现猫咪的耳尖淋湿了，便蹲下来，把它也拢进伞里。',wash:'#e2e6d5'},
    {scene:'rain',phase:2,title:'绕过水洼，也绕点远路',description:'回去只要几步，它们却绕着水洼走了好久。猫咪先踩出一串小脚印，公主一步一步跟在后面。',wash:'#e2e5d0'},
    {scene:'rain',phase:3,title:'原来晴天藏在这里',description:'到门口时，雨停了。彩虹搭在城堡上，两双湿脚印并排留在台阶前，谁也没有急着擦掉。',wash:'#e9e7c9'}
  ]},
  {id:'last-slice',title:'最后一块蛋糕',summary:'一块舍不得吃的蛋糕，最后分给了谁？',tone:'peach',pages:[
    {scene:'picnic',phase:0,title:'盘子里，只剩一块',description:'下午茶快结束了，盘子里还留着最后一块蛋糕。公主看向猫咪，猫咪立刻假装在看窗外。',wash:'#f0dfc0'},
    {scene:'picnic',phase:1,title:'推来，又推回去',description:'她把盘子推过去，猫咪又用爪子推回来。小盘子在桌上走了几个来回，奶油晃了晃。',wash:'#f1dfc7'},
    {scene:'picnic',phase:2,title:'分成两半，就好啦',description:'公主拿来小刀，把蛋糕切成两半。猫咪低头量了量，悄悄把大一点的那块推给了她。',wash:'#f0e2c8'},
    {scene:'picnic',phase:3,title:'还有一颗草莓',description:'吃到最后，它们才发现盘边留着一颗草莓。公主掰成两瓣，这回不用再推来推去了。',wash:'#ede2c9'}
  ]},
  {id:'waiting-for-a-flower',title:'等一朵花醒来',summary:'猫咪种下的小秘密，今天会开花吗？',tone:'olive',pages:[
    {scene:'garden',phase:0,title:'花盆里，藏着个秘密',description:'猫咪把一粒种子埋在窗下。公主问它种了什么，它只把沾着泥的爪子藏到身后。',wash:'#e2e7c8'},
    {scene:'garden',phase:1,title:'今天也没有开花',description:'猫咪每天都来浇水，等了又等，只有两片新叶。公主搬来一张小凳，陪它一起坐了一会儿。',wash:'#e5e8cf'},
    {scene:'garden',phase:2,night:true,title:'风来的时候',description:'夜里忽然起了风，猫咪抱住花盆不肯走。公主撑起小棚，把花和猫咪都护在了里面。',wash:'#dfe4c9'},
    {scene:'garden',phase:3,title:'你来得，刚刚好',description:'第二天清早，花瓣一点点展开。猫咪转身去找公主，发现她就在身后，手里还拿着小水壶。',wash:'#e8e9ce'}
  ]}
];
export const SPREADS=BOOKS.flatMap((book,bookIndex)=>book.pages.map((page,pageIndex)=>({...page,bookId:book.id,bookIndex,pageIndex})));
export const startOfBook=id=>SPREADS.findIndex(page=>page.bookId===id);

# Watchlist archive

2026-09-04 に watchlist を 185 本から 40 本に絞ったときに外した 145 本の記録。サイトには出ない (`movies/` から削除済み) が、判断の根拠ごと残してある。

## 絞り込みの基準

評価済み55本 (平均 7.50) から出した実測値:

| 軸 | 値 |
| --- | --- |
| Mystery | 14本 / 8.10 / **+0.60** |
| Crime | 22本 / 7.97 / **+0.47** |
| Thriller | 20本 / 7.79 / +0.29 |
| Suspense | 9本 / 7.74 / +0.24 |
| Horror | 8本 / 7.49 / -0.01 (分散大) |
| Anime | 2本 / 6.75 / -0.75 |
| Fantasy | 3本 / 6.57 / -0.93 |
| Comedy | 4本 / 6.38 / **-1.12** |
| Superhero | 1本 / 5.00 / **-2.50** |
| Period | 2本 / 4.50 / **-3.00** |

国別は Japan が -0.28 で沈むが、**クライムレーン (Crime/Mystery/Thriller/Suspense) に絞ると Japan 8.07 で全国中トップ** (USA 7.85, Korea 7.76)。国の平均だけで日本作品を落とすのは誤り。

リポの `recommendWatchlist` の予測値も参考にしたが、そのまま上位40本を採ってはいない。**`Action` タグが韓国クライムを不当に沈める**という既知のバグがあり、The Yellow Sea (147位)、Veteran (148位)、I Saw the Devil (136位)、Asura (139位) が最下位付近に並んでいた。実際の高評価は Yadang 8.5 / Inside Men 8.4 / Oldboy 8.3 / The Chaser 8.0 と、まさにそのレーン。タグ由来の人工物なので手で戻した。

## 戻し方

`type: movie` ラベルの issue を立てて List = Watchlist で投げ直せばよい (自動化が `movies/<slug>.md` を再生成する)。削除前のファイルそのものが要るなら:

```bash
git log --diff-filter=D --name-only -- "movies/*.md"   # 削除コミットを探す
git show <sha>^:movies/<slug>.md                        # 中身を復元
```

## 残した40本

罪の声 / 三度目の殺人 / 怒り / ある男 / 怪物 / 悪の教典 / ヤクザと家族 The Family / 地面師たち / CURE キュア / 渇き。 / Memories of Murder / The Handmaiden / Decision to Leave / The Yellow Sea / I Saw the Devil / New World / Nameless Gangster / Mother / Stranger / Beyond Evil / Bad Times at the El Royale / A Simple Favor / See How They Run / Anatomy of a Fall / Gone Girl / Searching / Heretic / Zodiac / Prisoners / Mystic River / No Country for Old Men / Fargo / 羊たちの沈黙 / Nightcrawler / True Detective / Uncut Gems / Sicario / Infernal Affairs / Incendies / Hereditary

## 外した145本

`予測` はリポの `recommendWatchlist` が出したスコア。

### 次点 (7)

| 作品 | 年 | 国 | タグ | JP配信 | 予測 | 理由 |
| --- | --- | --- | --- | --- | --- | --- |
| The Place Beyond the Pines | 2013 | USA | Crime/Drama/Thriller | Netflix,U-NEXT | 7.90 | 米クライム枠が canon で埋まった |
| Good Time | 2017 | USA | Crime/Thriller | Prime Video,U-NEXT,Hulu | 7.88 | Uncut Gems と同じ Safdie 兄弟。1本に絞った |
| Hell or High Water | 2016 | USA | Crime/Thriller | Netflix | 7.88 | No Country / Sicario と同じ西部クライム。2本に絞った |
| Signal | 2016 | Korea | Crime/Mystery/Thriller/Series | Netflix,Disney+,Prime Video | 7.87 | Stranger / Beyond Evil と枠を争って落選。韓国クライム連ドラを3本は積みすぎ |
| 空白 | 2021 | Japan | Drama/Suspense | U-NEXT,Hulu | 7.78 | 吉田恵輔。ヒメアノ〜ル(7.7)の系譜だが、日本枠10本に入らなかった |
| Only Murders in the Building | 2021 | USA | Mystery/Comedy/Crime/Series | Disney+ | 7.74 | フーダニット×コメディは最高スコア帯だが、See How They Run と A Simple Favor が映画で同じ枠を埋めた |
| Green Room | 2016 | USA | Thriller/Horror/Survival | - | 7.56 | JP のサブスク配信なし。Saulnier 枠は見送り |

### コアレーンだが枠外 (86)

| 作品 | 年 | 国 | タグ | JP配信 | 予測 | 理由 |
| --- | --- | --- | --- | --- | --- | --- |
| The Drug King | 2018 | Korea | Crime | Netflix | 8.00 | モデル3位。韓国クライム枠は Memories of Murder 以下8本で埋まった |
| ロストケア | 2023 | Japan | Crime/Mystery/Drama | Netflix,Prime Video,U-NEXT,Hulu | 7.98 | モデル予測 7.98 / 4位。40本に入らなかった |
| あしたの少女 | 2023 | Korea | Drama/Crime/Mystery | Hulu | 7.98 | モデル予測 7.98 / 9位。40本に入らなかった |
| Boston Strangler | 2023 | USA | Crime/Mystery/Thriller | Disney+ | 7.97 | モデル予測 7.97 / 14位。40本に入らなかった |
| Hold the Dark | 2018 | USA | Thriller/Crime/Mystery | Netflix | 7.97 | Saulnier 枠は Green Room ともども見送り |
| Wind River | 2017 | USA | Crime/Mystery/Thriller | Prime Video,U-NEXT,Hulu | 7.97 | モデル予測 7.97 / 19位。40本に入らなかった |
| I'm Thinking of Ending Things | 2020 | USA | Thriller/Mystery/Drama | Netflix | 7.96 | モデル予測 7.96 / 24位。40本に入らなかった |
| ラストマイル | 2024 | Japan | Mystery/Suspense/Crime | Prime Video | 7.95 | モデル予測 7.95 / 25位。40本に入らなかった |
| すばらしき世界 | 2021 | Japan | Drama/Crime | Prime Video,U-NEXT | 7.95 | モデル予測 7.95 / 26位。40本に入らなかった |
| 岬の兄妹 | 2019 | Japan | Crime/Drama | Netflix,U-NEXT | 7.95 | モデル予測 7.95 / 28位。40本に入らなかった |
| ７番房の奇跡 | 2013 | Korea | Drama/Crime | Netflix,Prime Video,U-NEXT,Hulu | 7.93 | モデル予測 7.93 / 31位。40本に入らなかった |
| Poetry | 2010 | Korea | Drama/Crime | Prime Video,U-NEXT | 7.93 | モデル予測 7.93 / 32位。40本に入らなかった |
| 愛なき森で叫べ | 2019 | Japan | Crime/Thriller/Drama | Netflix | 7.91 | モデル予測 7.91 / 34位。40本に入らなかった |
| The Devil All the Time | 2020 | USA | Crime/Thriller/Drama | Netflix | 7.90 | モデル予測 7.90 / 37位。40本に入らなかった |
| 屍人荘の殺人 | 2019 | Japan | Mystery/Thriller/Suspense | Netflix,U-NEXT,Prime Video | 7.90 | モデル予測 7.90 / 39位。40本に入らなかった |
| ミステリー・アリーナ | 2026 | Japan | Mystery/Suspense | - | 7.89 | モデル予測 7.89 / 40位。40本に入らなかった |
| 年少日記 | 2023 | Hong Kong | Drama/Mystery | - | 7.88 | モデル予測 7.88 / 44位。40本に入らなかった |
| Night Patrol | 2026 | USA | Crime/Thriller | - | 7.88 | モデル予測 7.88 / 48位。40本に入らなかった |
| The Killer | 2023 | USA | Crime/Thriller | Netflix | 7.88 | モデル予測 7.88 / 50位。40本に入らなかった |
| The Rip | 2026 | USA | Crime/Thriller | Netflix | 7.88 | モデル予測 7.88 / 51位。40本に入らなかった |
| ヴィレッジ | 2023 | Japan | Crime/Suspense/Drama | Netflix | 7.88 | モデル予測 7.88 / 52位。40本に入らなかった |
| でっちあげ 〜殺人教師と呼ばれた男 | 2025 | Japan | Drama/Suspense/Crime | Netflix | 7.88 | モデル予測 7.88 / 53位。40本に入らなかった |
| 教場 Requiem | 2026 | Japan | Suspense/Crime/Drama | - | 7.88 | モデル予測 7.88 / 54位。40本に入らなかった |
| 市子 | 2023 | Japan | Mystery/Drama/Suspense | Netflix,Prime Video,U-NEXT,Hulu | 7.87 | モデル予測 7.87 / 55位。40本に入らなかった |
| 由宇子の天秤 | 2021 | Japan | Drama/Suspense/Mystery | U-NEXT | 7.87 | モデル予測 7.87 / 56位。40本に入らなかった |
| Longlegs | 2024 | USA | Horror/Crime/Mystery | Prime Video,U-NEXT,Hulu | 7.87 | モデル予測 7.87 / 57位。40本に入らなかった |
| 最後まで行く | 2023 | Japan | Crime/Thriller/Suspense | Netflix,U-NEXT | 7.87 | モデル予測 7.87 / 62位。40本に入らなかった |
| 新幹線大爆破 | 2025 | Japan | Thriller/Suspense/Crime | Netflix | 7.87 | モデル予測 7.87 / 63位。40本に入らなかった |
| The Witch | 2016 | USA | Horror/Mystery/Drama | U-NEXT | 7.86 | モデル予測 7.86 / 65位。40本に入らなかった |
| Fractured | 2019 | USA | Thriller/Mystery/Suspense | Netflix | 7.85 | モデル予測 7.85 / 67位。40本に入らなかった |
| No Exit | 2022 | USA | Thriller/Suspense/Mystery | Disney+ | 7.85 | モデル予測 7.85 / 68位。40本に入らなかった |
| No One Will Save You | 2023 | USA | Thriller/Suspense/Mystery | Disney+ | 7.85 | モデル予測 7.85 / 69位。40本に入らなかった |
| The Night House | 2021 | USA | Thriller/Mystery/Suspense | Disney+ | 7.85 | モデル予測 7.85 / 71位。40本に入らなかった |
| The Woman in the Window | 2021 | USA | Thriller/Mystery/Suspense | Netflix | 7.85 | モデル予測 7.85 / 72位。40本に入らなかった |
| Fair Play | 2023 | USA | Thriller/Drama | Netflix | 7.85 | モデル予測 7.85 / 74位。40本に入らなかった |
| A Sun | 2019 | Taiwan | Drama/Crime | Netflix | 7.85 | モデル予測 7.85 / 75位。40本に入らなかった |
| Aftersun | 2022 | UK | Drama/Mystery | Prime Video,U-NEXT | 7.82 | モデル予測 7.82 / 82位。40本に入らなかった |
| The Father | 2021 | UK | Drama/Mystery | Prime Video,Hulu | 7.82 | モデル予測 7.82 / 83位。40本に入らなかった |
| ミスター・ノーバディ | 2009 | Canada | Sci-fi/Drama/Mystery | U-NEXT | 7.82 | モデル予測 7.82 / 84位。40本に入らなかった |
| 死霊館 | 2013 | USA | Horror/Mystery | U-NEXT,Hulu | 7.81 | モデル予測 7.81 / 87位。40本に入らなかった |
| プリデスティネーション | 2014 | Australia | Sci-fi/Thriller/Mystery | - | 7.81 | モデル予測 7.81 / 88位。40本に入らなかった |
| It Comes | 2018 | Japan | Horror/Mystery/Thriller | U-NEXT | 7.81 | モデル予測 7.81 / 89位。40本に入らなかった |
| Ring | 1998 | Japan | Horror/Mystery/Thriller | U-NEXT,Hulu | 7.81 | モデル予測 7.81 / 90位。40本に入らなかった |
| ホムンクルス | 2021 | Japan | Mystery/Thriller/Horror | Netflix | 7.81 | モデル予測 7.81 / 91位。40本に入らなかった |
| His House | 2020 | UK | Horror/Mystery/Drama | Netflix | 7.81 | モデル予測 7.81 / 92位。40本に入らなかった |
| 藁の楯 | 2013 | Japan | Crime/Thriller/Action | Netflix,U-NEXT,Prime Video,Hulu | 7.80 | モデル予測 7.80 / 93位。40本に入らなかった |
| The Man Standing Next | 2020 | Korea | Crime/Thriller/Drama | Netflix,U-NEXT,Hulu | 7.79 | Inside Men(8.4)の系譜だが New World を優先 |
| Pulse | 2001 | Japan | Horror/Mystery/Sci-fi | Prime Video,U-NEXT,Hulu | 7.79 | モデル予測 7.79 / 98位。40本に入らなかった |
| Barbarian | 2022 | USA | Horror/Thriller/Mystery | - | 7.79 | モデル予測 7.79 / 101位。40本に入らなかった |
| Weapons | 2025 | USA | Horror/Mystery/Thriller | U-NEXT | 7.79 | モデル予測 7.79 / 103位。40本に入らなかった |
| エスター ファースト・キル | 2022 | USA | Horror/Thriller/Mystery | Prime Video,Hulu | 7.79 | モデル予測 7.79 / 104位。40本に入らなかった |
| マリグナント 狂暴な悪夢 | 2021 | USA | Horror/Mystery/Thriller | U-NEXT,Hulu | 7.79 | モデル予測 7.79 / 105位。40本に入らなかった |
| Noroi: The Curse | 2005 | Japan | Horror/Mystery | - | 7.78 | モデル予測 7.78 / 108位。40本に入らなかった |
| 愛に乱暴 | 2024 | Japan | Suspense/Drama | Prime Video | 7.78 | モデル予測 7.78 / 109位。40本に入らなかった |
| 正欲 | 2023 | Japan | Drama/Suspense | Netflix,Prime Video | 7.78 | モデル予測 7.78 / 110位。40本に入らなかった |
| Rebecca | 2020 | UK | Mystery/Drama/Thriller | Netflix | 7.77 | モデル予測 7.77 / 115位。40本に入らなかった |
| A Tale of Two Sisters | 2003 | Korea | Horror/Mystery/Drama | Prime Video | 7.76 | モデル予測 7.76 / 116位。40本に入らなかった |
| Detention | 2019 | Taiwan | Horror/Mystery/Drama | U-NEXT | 7.75 | モデル予測 7.75 / 120位。40本に入らなかった |
| Lake Mungo | 2009 | Australia | Horror/Mystery/Drama | - | 7.75 | モデル予測 7.75 / 121位。40本に入らなかった |
| スイート・マイホーム | 2023 | Japan | Horror/Suspense/Mystery | Netflix,Prime Video,U-NEXT,Hulu | 7.75 | モデル予測 7.75 / 123位。40本に入らなかった |
| Calibre | 2018 | UK | Thriller/Crime/Drama | Netflix | 7.75 | モデル予測 7.75 / 124位。40本に入らなかった |
| Impetigore | 2019 | Indonesia | Horror/Mystery/Thriller | - | 7.74 | モデル予測 7.74 / 125位。40本に入らなかった |
| Oddity | 2024 | Ireland | Horror/Mystery/Thriller | - | 7.74 | モデル予測 7.74 / 126位。40本に入らなかった |
| The Killing of a Sacred Deer | 2017 | Ireland | Horror/Thriller/Mystery | Prime Video,U-NEXT | 7.74 | モデル予測 7.74 / 127位。40本に入らなかった |
| The Medium | 2021 | Thailand | Horror/Mystery | Prime Video,U-NEXT,Hulu | 7.74 | モデル予測 7.74 / 128位。40本に入らなかった |
| Rebel Ridge | 2024 | USA | Action/Thriller/Crime | Netflix | 7.74 | Saulnier 枠は見送り |
| Sinners | 2025 | USA | Horror/Crime/Thriller | U-NEXT | 7.73 | モデル予測 7.73 / 132位。40本に入らなかった |
| Strange Darling | 2024 | USA | Horror/Thriller/Crime | Hulu | 7.73 | モデル予測 7.73 / 133位。40本に入らなかった |
| Exhuma | 2024 | Korea | Mystery/Horror/Thriller | Prime Video | 7.70 | モデル予測 7.70 / 137位。40本に入らなかった |
| Windfall | 2022 | USA | Thriller/Black-Comedy | Netflix | 7.69 | モデル予測 7.69 / 138位。40本に入らなかった |
| Asura: The City of Madness | 2016 | Korea | Crime/Thriller/Action | U-NEXT,Hulu | 7.69 | モデル予測 7.69 / 139位。40本に入らなかった |
| Believer | 2018 | Korea | Crime/Thriller/Action | Netflix,U-NEXT | 7.69 | モデル予測 7.69 / 140位。40本に入らなかった |
| Humint | 2026 | Korea | Action/Thriller/Crime | Netflix | 7.69 | モデル予測 7.69 / 141位。40本に入らなかった |
| Kill Boksoon | 2023 | Korea | Action/Thriller/Crime | Netflix | 7.69 | モデル予測 7.69 / 142位。40本に入らなかった |
| Night in Paradise | 2021 | Korea | Crime/Thriller/Action | Netflix | 7.69 | モデル予測 7.69 / 143位。40本に入らなかった |
| The Gangster, the Cop, the Devil | 2019 | Korea | Crime/Action/Thriller | Netflix | 7.69 | モデル予測 7.69 / 144位。40本に入らなかった |
| The Outlaws | 2017 | Korea | Crime/Action/Thriller | Netflix,U-NEXT,Hulu | 7.69 | アクション寄り。同レーンは The Yellow Sea / I Saw the Devil を優先 |
| Veteran | 2015 | Korea | Crime/Action/Thriller | Prime Video,U-NEXT | 7.69 | モデル予測 7.69 / 148位。40本に入らなかった |
| モンスターズ／地球外生命体 | 2010 | UK | Sci-fi/Drama/Thriller | U-NEXT,Hulu | 7.67 | モデル予測 7.67 / 152位。40本に入らなかった |
| 非常宣言 | 2022 | Korea | Thriller/Suspense/Drama | Prime Video,U-NEXT | 7.66 | モデル予測 7.66 / 154位。40本に入らなかった |
| Prey | 2022 | USA | Sci-fi/Action/Thriller | Disney+ | 7.66 | モデル予測 7.66 / 155位。40本に入らなかった |
| The Irishman | 2019 | USA | Crime/Biographical | Netflix | 7.65 | モデル予測 7.65 / 156位。40本に入らなかった |
| Kill List | 2011 | UK | Horror/Crime/Thriller | - | 7.65 | モデル予測 7.65 / 157位。40本に入らなかった |
| ジェントルメン | 2020 | UK | Crime/Black-Comedy/Action | Prime Video,U-NEXT | 7.56 | モデル予測 7.56 / 166位。40本に入らなかった |
| Time to Hunt | 2020 | Korea | Thriller/Action/Sci-fi | Netflix | 7.55 | モデル予測 7.55 / 168位。40本に入らなかった |
| All of Us Strangers | 2024 | UK | Drama/Mystery/Fantasy | Disney+ | 7.53 | モデル予測 7.53 / 170位。40本に入らなかった |

### 重複 (7)

| 作品 | 年 | 国 | タグ | JP配信 | 予測 | 理由 |
| --- | --- | --- | --- | --- | --- | --- |
| 悪人 | 2010 | Japan | Crime/Drama | Netflix,Prime Video,U-NEXT | 7.95 | 同じ李相日・同じ吉田修一原作の 怒り を残した |
| The Departed | 2006 | USA | Crime/Thriller | Netflix,U-NEXT | 7.88 | オリジナルの Infernal Affairs を残した |
| Infernal Affairs II | 2003 | Hong Kong | Crime/Thriller | Prime Video | 7.83 | 1作目のみ残す |
| Infernal Affairs III | 2003 | Hong Kong | Crime/Thriller | Netflix,U-NEXT,Prime Video | 7.83 | 1作目のみ残す |
| The Roundup | 2022 | Korea | Action/Crime/Thriller | Netflix,Hulu | 7.69 | 1作目 The Outlaws ともども韓国アクション枠から外した |
| ファイナル・デッドサーキット | 2009 | USA | Horror/Thriller | Prime Video,U-NEXT,Hulu | 7.62 | シリーズ5本を既に消化済み |
| ファイナル・デッドブラッド | 2025 | USA | Horror/Thriller | U-NEXT | 7.62 | シリーズ5本を既に消化済み |

### シリーズ積み (17)

| 作品 | 年 | 国 | タグ | JP配信 | 予測 | 理由 |
| --- | --- | --- | --- | --- | --- | --- |
| アンナチュラル | 2018 | Japan | Mystery/Drama/Series | Netflix,Disney+,Prime Video,U-NEXT,Hulu | 7.97 | 既に5本 In Progress。連ドラは Stranger / Beyond Evil / 地面師たち / True Detective の4本に絞った |
| ハンニバル | 2013 | USA | Crime/Thriller/Mystery/Series | U-NEXT | 7.97 | 既に5本 In Progress。連ドラは Stranger / Beyond Evil / 地面師たち / True Detective の4本に絞った |
| マスクガール | 2023 | Korea | Crime/Drama/Series | Netflix | 7.93 | 既に5本 In Progress。連ドラは Stranger / Beyond Evil / 地面師たち / True Detective の4本に絞った |
| リブート | 2026 | Japan | Suspense/Mystery/Series | Netflix | 7.89 | 既に5本 In Progress。連ドラは Stranger / Beyond Evil / 地面師たち / True Detective の4本に絞った |
| 最愛 | 2021 | Japan | Mystery/Suspense/Series | Netflix,Disney+,Prime Video,Hulu | 7.89 | 既に5本 In Progress。連ドラは Stranger / Beyond Evil / 地面師たち / True Detective の4本に絞った |
| 落日 | 2023 | Japan | Suspense/Mystery/Series | Prime Video,U-NEXT,Hulu | 7.89 | 既に5本 In Progress。連ドラは Stranger / Beyond Evil / 地面師たち / True Detective の4本に絞った |
| インフォーマ | 2023 | Japan | Crime/Suspense/Series | Netflix,Prime Video,Hulu | 7.88 | 既に5本 In Progress。連ドラは Stranger / Beyond Evil / 地面師たち / True Detective の4本に絞った |
| ペーパー・ハウス | 2017 | Spain | Crime/Thriller/Series | Netflix | 7.83 | 既に5本 In Progress。連ドラは Stranger / Beyond Evil / 地面師たち / True Detective の4本に絞った |
| 国民死刑投票 | 2023 | Korea | Thriller/Crime/Series | Prime Video | 7.81 | 既に5本 In Progress。連ドラは Stranger / Beyond Evil / 地面師たち / True Detective の4本に絞った |
| 浪漫ドクター キム・サブ | 2016 | Korea | Drama/Series | Netflix,Disney+,Prime Video,U-NEXT | 7.76 | 既に5本 In Progress。連ドラは Stranger / Beyond Evil / 地面師たち / True Detective の4本に絞った |
| 良くも、悪くも、だって母親 | 2023 | Korea | Drama/Series | Netflix | 7.76 | 既に5本 In Progress。連ドラは Stranger / Beyond Evil / 地面師たち / True Detective の4本に絞った |
| 賢い医師生活 | 2020 | Korea | Drama/Series | Netflix | 7.76 | 既に5本 In Progress。連ドラは Stranger / Beyond Evil / 地面師たち / True Detective の4本に絞った |
| マイネーム: 偽りと復讐 | 2021 | Korea | Crime/Action/Series | Netflix | 7.75 | 既に5本 In Progress。連ドラは Stranger / Beyond Evil / 地面師たち / True Detective の4本に絞った |
| SKYキャッスル | 2018 | Korea | Drama/Suspense/Series | Netflix,Disney+,Prime Video | 7.71 | 既に5本 In Progress。連ドラは Stranger / Beyond Evil / 地面師たち / True Detective の4本に絞った |
| ザ・グローリー ～輝かしき復讐～ | 2022 | Korea | Drama/Thriller/Series | Netflix | 7.68 | 既に5本 In Progress。連ドラは Stranger / Beyond Evil / 地面師たち / True Detective の4本に絞った |
| 弱いヒーロー | 2022 | Korea | Drama/Action/Series | Netflix,Prime Video | 7.59 | 既に5本 In Progress。連ドラは Stranger / Beyond Evil / 地面師たち / True Detective の4本に絞った |
| ニュートピア | 2025 | Korea | Horror/Action/Series | Prime Video | 7.51 | 既に5本 In Progress。連ドラは Stranger / Beyond Evil / 地面師たち / True Detective の4本に絞った |

### ムード系ホラー (10)

| 作品 | 年 | 国 | タグ | JP配信 | 予測 | 理由 |
| --- | --- | --- | --- | --- | --- | --- |
| Audition | 2000 | Japan | Horror/Thriller/Drama | Prime Video | 7.73 | Horror は -0.01 だが分散が大きい (28 Years Later 8.5 / ８番出口 6.0)。謎の形をしていないホラーは外した |
| Speak No Evil | 2022 | Denmark | Horror/Thriller/Drama | U-NEXT,Hulu | 7.67 | Horror は -0.01 だが分散が大きい (28 Years Later 8.5 / ８番出口 6.0)。謎の形をしていないホラーは外した |
| The Innocents | 2021 | Norway | Horror/Thriller/Drama | Prime Video,U-NEXT,Hulu | 7.67 | Horror は -0.01 だが分散が大きい (28 Years Later 8.5 / ８番出口 6.0)。謎の形をしていないホラーは外した |
| Gerald's Game | 2017 | USA | Thriller/Horror/Suspense | Netflix | 7.64 | Horror は -0.01 だが分散が大きい (28 Years Later 8.5 / ８番出口 6.0)。謎の形をしていないホラーは外した |
| When Evil Lurks | 2023 | Argentina | Horror/Thriller | Hulu | 7.62 | Horror は -0.01 だが分散が大きい (28 Years Later 8.5 / ８番出口 6.0)。謎の形をしていないホラーは外した |
| Fresh | 2022 | USA | Thriller/Black-Comedy/Horror | Disney+ | 7.61 | Horror は -0.01 だが分散が大きい (28 Years Later 8.5 / ８番出口 6.0)。謎の形をしていないホラーは外した |
| Save the Green Planet! | 2003 | Korea | Thriller/Black-Comedy/Horror | - | 7.54 | Horror は -0.01 だが分散が大きい (28 Years Later 8.5 / ８番出口 6.0)。謎の形をしていないホラーは外した |
| The Substance | 2024 | UK | Horror/Thriller/Black-Comedy | Prime Video | 7.52 | Horror は -0.01 だが分散が大きい (28 Years Later 8.5 / ８番出口 6.0)。謎の形をしていないホラーは外した |
| Train to Busan | 2016 | Korea | Horror/Thriller/Action | Netflix,Prime Video,U-NEXT,Hulu | 7.52 | Horror は -0.01 だが分散が大きい (28 Years Later 8.5 / ８番出口 6.0)。謎の形をしていないホラーは外した |
| The Descent | 2005 | UK | Horror/Thriller/Survival | - | 7.49 | Horror は -0.01 だが分散が大きい (28 Years Later 8.5 / ８番出口 6.0)。謎の形をしていないホラーは外した |

### クライム軸なし (5)

| 作品 | 年 | 国 | タグ | JP配信 | 予測 | 理由 |
| --- | --- | --- | --- | --- | --- | --- |
| グローリー | 1990 | USA | Drama/Epic | U-NEXT | 7.91 | Drama 主体でミステリ/クライムの背骨がない |
| Manchester by the Sea | 2016 | USA | Drama | Prime Video,U-NEXT | 7.79 | Drama 主体でミステリ/クライムの背骨がない |
| Sound of Metal | 2020 | USA | Drama | Prime Video | 7.79 | Drama 主体でミステリ/クライムの背骨がない |
| 溺れるナイフ | 2016 | Japan | Drama | U-NEXT,Hulu | 7.66 | Drama 主体でミステリ/クライムの背骨がない |
| フェイブルマンズ | 2022 | USA | Drama/Biographical | Prime Video | 7.65 | Drama 主体でミステリ/クライムの背骨がない |

### 劇場で観る枠 (2)

| 作品 | 年 | 国 | タグ | JP配信 | 予測 | 理由 |
| --- | --- | --- | --- | --- | --- | --- |
| 猿の惑星 | 1968 | USA | Sci-fi/Drama | Disney+ | 7.80 | Sci-fi / Action の大作は watchlist に積まず劇場で消化している (Running Man 7.9, Predator 7.7, Jurassic 7.5, Tron 6.9) |
| ハンガー・ゲーム | 2012 | USA | Sci-fi/Action/Dystopian | U-NEXT | 7.50 | Sci-fi / Action の大作は watchlist に積まず劇場で消化している (Running Man 7.9, Predator 7.7, Jurassic 7.5, Tron 6.9) |

### 低スコアジャンル (11)

| 作品 | 年 | 国 | タグ | JP配信 | 予測 | 理由 |
| --- | --- | --- | --- | --- | --- | --- |
| PERFECT BLUE | 1998 | Japan | Anime/Suspense/Mystery | Netflix,U-NEXT,Prime Video,Hulu | 7.62 | Anime は -0.75 (2本/6.75) |
| ひぐらしのなく頃に | 2006 | Japan | Anime/Horror/Mystery/Series | U-NEXT,Hulu | 7.50 | Anime は -0.75 (2本/6.75) |
| Tumbbad | 2018 | India | Horror/Fantasy/Drama | - | 7.43 | Fantasy は -0.93 (3本/6.57) |
| 攻殻機動隊 | 1995 | Japan | Anime/Sci-fi | Netflix,U-NEXT,Prime Video,Hulu | 7.42 | Anime は -0.75 (2本/6.75) |
| ルックバック | 2024 | Japan | Anime/Drama | Prime Video | 7.39 | Anime は -0.75 (2本/6.75) |
| 炎炎ノ消防隊 | 2019 | Japan | Anime/Action/Series | Netflix,Prime Video,U-NEXT,Hulu | 7.23 | Anime は -0.75 (2本/6.75) |
| 悪霊狩猟団: カウンターズ | 2020 | Korea | Action/Fantasy/Series | Netflix | 7.22 | Fantasy は -0.93 (3本/6.57) |
| The Northman | 2022 | USA | Epic/Action/Period | Netflix | 7.14 | Period は -3.00 (2本/4.50)、diary で最低 |
| トラブル・カレッジ／大学をつくろう！ | 2006 | USA | Comedy | - | 7.05 | Comedy は -1.12 (4本/6.38) |
| 燃えよ剣 | 2021 | Japan | Period/Action | Netflix,U-NEXT | 6.49 | Period は -3.00 (2本/4.50)、diary で最低 |
| 関ヶ原 | 2017 | Japan | Period/Action | Netflix,U-NEXT | 6.49 | Period は -3.00 (2本/4.50)、diary で最低 |

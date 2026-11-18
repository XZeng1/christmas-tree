照片目录 / Photo folder
======================

把照片放进这个目录（本地文件夹或 GitHub 仓库都可以），页面启动时自动读取。
没有上传按钮，服务端也不需要任何代码。

支持格式：jpg / jpeg / png / webp / avif / gif
建议单张不超过 3MB（手机原图 5MB+ 会让首屏明显变慢）


一、直接往 GitHub 仓库里传（推荐）
--------------------------------
1. 打开仓库 → `photos` 文件夹 → Add file → Upload files
2. 把照片拖进去，**文件名随意**（IMG_2841.JPG、婚纱照 1.jpg 都行）
3. Commit changes
4. 等 30～60 秒 Pages 重新部署，刷新页面（或按 R）

原理：页面在 `*.github.io` 上运行时，会用 GitHub Contents API 读取 `photos/`
的文件清单，所以不需要改名、也不需要手动维护 manifest.json。

缓存：每个访客 5 分钟内只查一次目录（sessionStorage），省得打爆 API 限额。
换完照片按 **R** 会强制清缓存重查，不用等。


二、本地预览时怎么办
-------------------
本地 http 服务（python -m http.server / Live Server 等）无法列目录，
所以本地靠下面两种方式之一：

  a) 文件名连续编号：1.jpg、2.jpg、3.jpg …（必须从 1 开始、中间不断号）
  b) manifest.json 列清单

两种都在下面详述。


三、方式一：序号命名
-------------------
    1.jpg
    2.jpg
    3.jpg

必须从 1 开始、中间不能缺号——扫描到第一个缺号就停止，后面的图不加载。


四、方式二：manifest.json（任意文件名）
------------------------------------
    {
      "photos": ["IMG_2841.JPG", "wedding-hall.jpg", "3.png"]
    }

列表顺序就是展示顺序。也支持完整路径或外链（http/https 开头）。
manifest 优先级低于仓库目录、高于序号命名。

不想手写就执行（扫描本目录重新生成）：

    node tools/build-photos.mjs


五、批量导入 + 自动编号（可选）
-----------------------------
如果照片在别的文件夹、想统一改名再放进来：

    node tools/add-photos.mjs "D:/我的照片"

会按文件名自然排序复制进来，重命名为 1.jpg、2.jpg…，同时更新 manifest。
参数：`--move` 导入后删源文件 / `--clean` 先清空旧图 / `--start 3` 指定起始序号。

注意：在 GitHub 网页上传的场景下**不需要**这个脚本，直接传就行。


六、为什么还保留 manifest
------------------------
GitHub API 未登录限流 **60 次/小时/IP**。如果同一出口 IP 的访客很多
（公司、校园、运营商 NAT），API 可能返回 403。这时页面会**静默回退**到
manifest.json；再不行才回退到序号命名。

所以脚本顺手生成的 manifest 相当于一层保险，别删。


七、图片放在别的仓库 / 子目录
---------------------------
编辑上一层的 config.json：

    {
      "repo": "owner/name",
      "photosDir": "album"
    }

- `repo` 留空（""）时自动从 `xxx.github.io/<仓库名>/` 推断
- 用自定义域名（非 github.io）时，必须手动填 `repo`
- `photosDir` 默认就是 `photos`


八、排错
--------
加载页底部那行小字会告诉你读到了什么：

    4 photo(s) · photos/ (repo)        ← 走的是仓库目录
    4 photo(s) · photos/ (manifest)    ← 走的是 manifest.json
    4 photo(s) · photos/ (1.jpg…)      ← 走的是序号探测
    no photos · photos/                ← 一张都没读到

显示 no photos 时依次检查：
  1. 仓库里 `photos/` 目录是否真的存在且里面有图（GitHub 上空目录不会被保存）
  2. Pages 是否已重新部署完（刚 commit 完的 30 秒内打开的是旧版本）
  3. 本地预览的话，看是否满足「序号连续」或「有 manifest.json」

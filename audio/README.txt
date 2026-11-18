背景音乐目录 / Audio folder
==========================

把背景音乐直接放在这里，页面会自动加载，不需要任何上传操作。

一、最简单的用法：固定文件名
----------------------------
    bgm.mp3

支持以下扩展名（按顺序探测）：
    mp3 / m4a / ogg / wav / aac / flac

二、指定别的文件名或外链
------------------------
编辑上一层的 config.json：

    {
      "greeting": "Merry Christmas",
      "music": "audio/our-song.mp3",
      "volume": 0.5
    }

- music 留空（""）时，自动去找 audio/bgm.mp3
- 也可以填完整外链，例如 "https://example.com/song.mp3"
- volume 取值 0 ~ 1，默认 0.5

三、注意
--------
浏览器禁止页面自动播放带声音的音频。这里的做法是：进入场景时那一下点击
（"Enter & Allow Camera" 按钮）同时触发播放。如果用户点得太快、音频还没
下载完，会退化成"下一次点击时开始播放"，控制台会有 [audio] 提示。

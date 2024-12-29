# Chatero

## Introduction

一个在 Zotero 里面总结论文的插件，与 Open WebUI 进行整合。在设置中添加 Open WebUI 的 API Key （可以通过抓包拿到） 之后，可以执行这几件事情

- 获取 Open WebUI 上的模型，作为模型的列表。

![Pref](./imgs/prefs.png)

- 上传论文的文本到 Open WebUI，以附件的形式对 Open WebUI 的模型进行请求，在侧边栏进行展示。（打开一个 PDF 之后依次点击这两个按钮即可开始生成，需要先填写 Open WebUI API Key 和选择一个模型）。

    ![Sidebar](./imgs/sidebar.png)

- 将结果总结结果上传到 Open WebUI，以实现后续的对话。

    ![Upload to History](./imgs/history.png)

- 把总结结果保存到 Zotero 的 Note 里面。

    ![Save to Notes](./imgs/notes.png)

## Discussion

- 必须要打开一个 PDF 才能调用插件，不能在主页里面直接选中一个 PDF 之后直接点击侧边栏的按钮。

- Prompt 是随便让 GPT 生成的一个 Prompt，感觉结果也还可以就直接用了。如果有更好的 Prompt 可以替换。

- 为什么不用 [Aria](https://github.com/lifan0127/ai-research-assistant) 或者 [zotero-gpt](https://github.com/MuiseDestiny/zotero-gpt)：因为太复杂了，用不明白，之前 zotero-gpt 没有成功跑起来，所以就自己写了一个。

- 与 papers.cool 的区别：papers.cool 只有 Arxiv 的论文，而且也不能改 Prompt。

- 现在还不支持用 Marker 去提取文本，而是用 Zotero 自己的提取文本的接口获取论文的内容，也没有自动化地去掉参考文献的部分。

## Installation

没有打包，只能通过源码安装。

```bash
npm install
npm start
```

就会开启来一个调试用的 Zotero，然后把他关掉，正常启动 Zotero 也会带上这个插件了。

如果没有显示，可以试试 (Zotero Plugin Development)[https://www.zotero.org/support/dev/client_coding/plugin_development] 里面的

> Open prefs.js in the Zotero profile directory in a text editor and delete the lines containing extensions.lastAppBuildId and extensions.lastAppVersion. Save the file and restart Zotero. This will force Zotero to read the 'extensions' directory and install your plugin from source, after which you should see it listed in Tools → Add-ons. This is only necessary once.

# Credit & Usage

基于 [zotero-plugin-template](https://github.com/windingwind/zotero-plugin-template) 进行开发。如何使用请参考模版里面的文档。

import { config } from "../../package.json";
import { getLocaleID, getString } from "../utils/locale";
import { getPref } from "../utils/prefs";
import markdownit from 'markdown-it'

export class BasicExampleFactory {
  static registerPrefs() {
    Zotero.PreferencePanes.register({
      pluginID: config.addonID,
      src: rootURI + "content/preferences.xhtml",
      label: getString("prefs-title"),
      image: `chrome://${config.addonRef}/content/icons/favicon.png`,
    });
  }
}

declare namespace Zotero {
  interface PDFWorker {
    getFullText: (itemID: number, maxPages: number, isPriority: boolean, password: string) => Promise<string>;
  }
}

const md = markdownit({
  breaks: true, // 将行结束符\n转换为 <br> 标签
  xhtmlOut: true, // 使用 /> 关闭标签，而不是 >
  typographer: true,
  html: true,
})

export class UIExampleFactory {
  static async registerReaderItemPaneSection() {
    let isGenerating = false;
    Zotero.ItemPaneManager.registerSection({
      paneID: "paper-summary",
      pluginID: config.addonID,
      header: {
        l10nID: getLocaleID("item-section-paper-summary-head-text"),
        // Optional
        l10nArgs: `{"status": "Idle"}`,
        // Can also have a optional dark icon
        icon: "chrome://zotero/skin/16/universal/book.svg",
      },
      sidenav: {
        l10nID: getLocaleID("item-section-paper-summary-sidenav-tooltip"),
        icon: "chrome://zotero/skin/16/universal/book.svg",
      },
      // Called when the section is asked to render, must be synchronous.
      onRender: ({
        body,
        item,
        setL10nArgs,
        setSectionSummary,
        setSectionButtonStatus,
      }) => {
      },
      // Optional, Called when the section is toggled. Can happen anytime even if the section is not visible or not rendered
      onToggle: ({ item }) => {
        ztoolkit.log("Section toggled!", item?.id);
      },
      // Optional, Buttons to be shown in the section header
      sectionButtons: [
        {
          type: "test",
          icon: "chrome://zotero/skin/16/universal/retrieve-metadata.svg",
          l10nID: getLocaleID("item-section-generate-summary-button-tooltip"),
          onClick: async ({ body, doc, paneID, setL10nArgs }) => {

            const showMessage = (message: string) => {
              new ztoolkit.ProgressWindow(config.addonName)
                .createLine({
                  text: "Please enable the WebUI URL option in the preferences.",
                  progress: 100,
                })
                .show();
            }

            if (isGenerating) {
              showMessage("Already generating!");
              return;
            }
            isGenerating = true;
            try {
              const reader = await ztoolkit.Reader.getReader();

              if (!reader) {
                showMessage("Reader not available!");
                return;
              }

              const item = reader._item;

              if (!item.isAttachment()) {
                showMessage("Not an attachment!");
                return
              }

              const contentType = item.attachmentContentType;

              let contentText: string | null = null;
              if (contentType === 'application/pdf') {
                const content = await Zotero.PDFWorker.getFullText(item.id, null, false, '');
                contentText = content?.text;
              } else if (contentType === 'text/plain') {
                const filePath = item.getFilePath();
                if (!filePath) {
                  showMessage("Failed to get file path!");
                  return;
                }
                const t = await Zotero.File.getContentsAsync(filePath);
                if (!t) {
                  showMessage("Failed to get file contents!");
                  return;
                }
                contentText = t.toLocaleString();
              }

              if (!contentText) {
                showMessage("Failed to extract text!");
                return;
              }

              let openWebuiUrl = getPref('openWebuiUrl') as string;
              const apiKey = getPref('openWebuiApiKey') as string;

              if (!openWebuiUrl) {
                showMessage("Please set the WebUI URL in the preferences.");
                return;
              }

              while (openWebuiUrl.endsWith('/')) {
                openWebuiUrl = openWebuiUrl.slice(0, -1);
              }
              const chatCompletionsUrl = `${openWebuiUrl}/chat/completions`;

              body.style.color = 'black';
              body.style.lineHeight = '2';
              setL10nArgs(`{ "status": "Loading" }`);

              let iframeBody: HTMLElement | undefined = undefined;
              let iframe: HTMLIFrameElement | undefined = undefined;

              const createIframe = () => {
                const innerHTML = '<div>Loading...</div>';
                iframe = doc.createElement('iframe');
                iframe.srcdoc = `
                <!DOCTYPE html>
                <html xmlns="http://www.w3.org/1999/xhtml">
                <head>
                  <style>
                    body {
                      font-family: sans-serif;
                      font-size: 12px;
                      }
                  </style>
                </head>
                <body>
                  ${innerHTML}
                </body>
                </html>`;
                iframe.style.border = 'none';
                iframe.style.width = '100%';

                if (body.firstChild) {
                  body.replaceChild(iframe, body.firstChild);
                }
                else {
                  body.appendChild(iframe);
                }

                setTimeout(() => {
                  if (iframe) {
                    iframeBody = iframe.contentDocument?.body;
                  } else {
                    ztoolkit.log('Failed to create iframe!');
                  }
                }, 100);
              }
              createIframe();

              let previousTextLength = 0;
              let responseBuffer = '';
              let fullResponse = '';
              let lastResponseTime = Date.now();

              const updateIframe = () => {
                if (iframeBody && iframe) {
                  const innerHTML = md.render(fullResponse);
                  iframeBody.innerHTML = innerHTML;

                  const height = (iframeBody?.scrollHeight || 0) + 30;
                  iframe.style.height = `${height}px`;
                }
              }

              const resp = await Zotero.HTTP.request(
                "POST",
                chatCompletionsUrl,
                {
                  successCodes: false,
                  headers: {
                    "Content-Type": "application/json",
                    'Authorization': `Bearer ${apiKey}`,
                  },
                  body: JSON.stringify({
                    model: 'chatgpt-4o-latest',
                    stream: true,
                    max_tokens: 4096,
                    messages: [
                      {
                        role: "system",
                        content: "你是一个了解深度学习、人工智能、系统安全的大模型，我需要你的帮助来快速理解这篇论文的核心内容。",
                      },
                      {
                        role: "user",
                        content: `我正在阅读一篇学术论文，我需要你的帮助来快速理解这篇论文的核心内容。以下是我需要的信息，请按照下面的结构逐一总结：

1. **研究的问题**：这篇论文针对的核心科学/技术问题是什么？作者试图解决什么样的挑战或回答什么样的问题？

2. **现有技术的问题**：在这个领域，目前已经存在的方法或技术有哪些问题或局限性？是什么激发了这项研究的动机？

3. **核心贡献**：这篇论文的主要贡献是什么？包括作者在理论、方法、实验或应用上的创新点。

4. **解决方案概述**：这篇论文是如何尝试解决上述问题的？简要总结作者的方法或者提出的解决方案。

5. **具体方法**：详细说明论文中提出的方法、技术或实验设计的核心步骤，尽量具体化。

请按照上述结构，对我将要提供的论文进行系统的总结和分析，请使用中文来进行总结。以下是论文的内容：

${contentText}`,
                      }
                    ]
                  }),
                  responseType: "text",
                  requestObserver: (xmlhttp: XMLHttpRequest) => {
                    xmlhttp.onprogress = (e: any) => {
                      const currentText = e.target.response;

                      const newContent = currentText.slice(previousTextLength);
                      previousTextLength = currentText.length;
                      responseBuffer += newContent;
                      const events = responseBuffer.split("\n\n");
                      responseBuffer = events.pop() || '';

                      if (responseBuffer.trim().startsWith('{')) {
                        try {
                          const parsedEvent = JSON.parse(responseBuffer.trim());
                          if (parsedEvent.detail) {
                            fullResponse += '\n\n\n**Error:** ' + parsedEvent.detail;
                          }
                        }
                        catch (error) {
                          ztoolkit.log(error);
                        }
                        return;
                      }

                      events.forEach(event => {
                        const cleanedEvent = event.replace(/^\s*data: /, '').trim();
                        if (cleanedEvent === '[DONE]') {
                          setL10nArgs(`{ "status": "Loaded" }`);
                          return;
                        }
                        try {
                          const parsedEvent = JSON.parse(cleanedEvent);
                          if (parsedEvent.choices && parsedEvent.choices.length > 0) {
                            const text = parsedEvent.choices[0].delta?.content || '';
                            if (text) {
                              fullResponse += text;

                              if (Date.now() - lastResponseTime > 100) {
                                lastResponseTime = Date.now();
                                updateIframe();
                              }
                            }
                          }
                        } catch (error) {
                          ztoolkit.log('Error parsing event:', error, event);
                        }
                      });
                    };
                  },
                }
              );

              if (resp.status !== 200) {
                setL10nArgs(`{ "status": "Error" }`);

                let content

                try {
                  const parsedEvent = JSON.parse(resp.responseText.trim());
                  if (!parsedEvent.detail) {
                    throw new Error('Not a detail error');
                  }
                }
                catch (e) {
                  content = resp.responseText ?? resp.statusText ?? resp.status;
                }
                if (content) {
                  fullResponse += `\n\n\n**Error:** \`\`\`${content}\`\`\``;
                }
              }

              updateIframe();
              isGenerating = false;
              setL10nArgs(`{ "status": "Loaded" }`);
            } finally {
              isGenerating = false;
            }
          },
        },
      ],
    });
  }
}

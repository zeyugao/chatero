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
        icon: "chrome://zotero/skin/20/universal/save.svg",
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
          onClick: async ({ body, item, paneID, setL10nArgs }) => {
            if (isGenerating) {
              new ztoolkit.ProgressWindow(config.addonName)
                .createLine({
                  text: "Already generating summary.",
                  progress: 100,
                })
                .show();
              return;
            }
            isGenerating = true;

            const reader = await ztoolkit.Reader.getReader();

            if (reader) {
              const item = reader._item;
              if (item.isAttachment()) {
                const contentType = item.attachmentContentType;
                if (contentType === 'application/pdf') {
                  const content = await Zotero.PDFWorker.getFullText(item.id, null, false, '');
                  const contentText: string = content?.text;
                  if (contentText) {
                    // const result = body.querySelector("#chatero-result") as HTMLElement;
                    // ztoolkit.log({ result });
                    let openWebuiUrl = String(getPref('openWebuiUrl'));
                    const apiKey = getPref('openWebuiApiKey') as string;

                    if (openWebuiUrl) {
                      while (openWebuiUrl.endsWith('/')) {
                        openWebuiUrl = openWebuiUrl.slice(0, -1);
                      }
                      const chatCompletionsUrl = `${openWebuiUrl}/chat/completions`;
                      ztoolkit.log({ contentText })

                      body.style.color = 'black';
                      setL10nArgs(`{ "status": "Loading" }`);

                      let previousTextLength = 0;
                      let responseBuffer = '';
                      let fullResponse = '';
                      await Zotero.HTTP.request(
                        "POST",
                        chatCompletionsUrl,
                        {
                          headers: {
                            "Content-Type": "application/json",
                            'Authorization': `Bearer ${apiKey}`,
                          },
                          body: JSON.stringify({
                            model: 'chatgpt-4o-latest',
                            stream: true,
                            messages: [
                              {
                                role: "system",
                                content: "你是一个了解深度学习、人工智能、系统安全的大模型",
                              },
                              {
                                role: "user",
                                content: `请你帮我对这一篇论文进行一些总结：${contentText}`,
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
                                    body.textContent += parsedEvent.detail;
                                  }
                                }
                                catch (error) {
                                  ztoolkit.log(error);
                                }
                                isGenerating = false;
                                return;
                              }

                              events.forEach(event => {
                                const cleanedEvent = event.replace(/^\s*data: /, '').trim();
                                if (cleanedEvent === '[DONE]') {
                                  ztoolkit.log('Streaming finished.');
                                  setL10nArgs(`{ "status": "Loaded" }`);
                                  isGenerating = false;

                                  return;
                                }
                                try {
                                  const parsedEvent = JSON.parse(cleanedEvent);
                                  if (parsedEvent.choices && parsedEvent.choices.length > 0) {
                                    const text = parsedEvent.choices[0].delta?.content || '';
                                    if (text) {
                                      fullResponse += text;
                                      body.innerHTML = md.render(fullResponse);
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

                      isGenerating = false;
                      setL10nArgs(`{ "status": "Loaded" }`);
                      ztoolkit.log("Loaded!");
                    } else {
                      new ztoolkit.ProgressWindow(config.addonName)
                        .createLine({
                          text: "Please enable the WebUI URL option in the preferences.",
                          progress: 100,
                        })
                        .show();
                    }
                  }
                }
              }
            }
          },
        },
      ],
    });
  }
}

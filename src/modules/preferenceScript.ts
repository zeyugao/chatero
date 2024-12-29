import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { getPref } from "../utils/prefs";

export async function registerPrefsScripts(_window: Window) {
  if (!addon.data.prefs) {
    addon.data.prefs = {
      window: _window,
    };
  } else {
    addon.data.prefs.window = _window;
  }
  await updatePrefsUI();
}

interface Model {
  id: string;
  name: string;

  info?: {
    id: string;
    params?: {
      max_tokens?: number;
      num_ctx?: number;
    };
  }
}
const getModels = async (refresh: boolean = false) => {
  // 获取 baseUrl 和 apiKey
  const baseUrl = getPref('openWebuiUrl') as string;
  const apiKey = getPref('openWebuiApiKey') as string;

  if (!baseUrl || !apiKey) {
    ztoolkit.log("Base URL or API Key is missing.");
    return [];
  }

  let response;
  try {
    response = await Zotero.HTTP.request(
      'GET',
      `${baseUrl}/models`,
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        followRedirects: true,
        noCache: true,
        successCodes: false,
        timeout: 30000,
      }
    );
  } catch (error) {
    ztoolkit.log(`Error getting models: ${error}`);
    return [];
  }

  try {
    const models: Model[] = JSON.parse(response.responseText).data;

    models.sort((a: Model, b: Model) => {
      return a.id.localeCompare(b.id);
    });

    return models;
  } catch (error) {
    ztoolkit.log(`Error parsing models: ${error}`);
    return [];
  }
}

async function updatePrefsUI() {
  const renderLock = ztoolkit.getGlobal("Zotero").Promise.defer();
  const prefs = addon.data.prefs;
  if (prefs === undefined || prefs.window == undefined) return;

  const prefsWindow = prefs.window;

  // 获取下拉框元素
  const modelChoicePopup = prefsWindow.document.querySelector(
    `#zotero-prefpane-${config.addonRef}-model-choice-popup`,
  ) as XUL.MenuPopup;

  // 动态插入选项
  if (modelChoicePopup) {
    modelChoicePopup.innerHTML = ""; // 清空现有选项
    getModels().then((models) => {
      models.forEach((model) => {
        const optionElement = prefsWindow.document.createXULElement("menuitem") as XUL.MenuItem;
        optionElement.setAttribute('value', model.id);
        optionElement.setAttribute('label', model.name);
        modelChoicePopup.appendChild(optionElement);
      });
    });
  }

  // 处理下拉框的变更事件
  modelChoicePopup?.addEventListener("change", (e) => {
    const selectedValue = (e.target as HTMLSelectElement).value;
    ztoolkit.log(`Selected model: ${selectedValue}`);
    // 其他操作，例如更新偏好设置
  });

  const markerCheckbox = prefsWindow.document.querySelector(
    `#zotero-prefpane-${config.addonRef}-use-marker`,
  ) as XUL.Checkbox;

  const markerFields = [
    prefsWindow.document.querySelector(
      `#zotero-prefpane-${config.addonRef}-marker-url`,
    ),
    prefsWindow.document.querySelector(
      `#zotero-prefpane-${config.addonRef}-marker-api-key`,
    ),
  ];

  const updateMarkerEnableStatus = (enabled: boolean) => {
    markerFields.forEach((field) => {
      if (field) {
        (field as HTMLInputElement).disabled = !enabled;
      }
    });
  }

  markerCheckbox?.addEventListener("command", (e) => {
    const checked = (e.target as XUL.Checkbox).checked;
    updateMarkerEnableStatus(checked);
  });

  let useMarker = Boolean(getPref('useMarker')) ?? false;
  updateMarkerEnableStatus(useMarker);

  addon.data
    .prefs!.window.document.querySelector(
      `#zotero-prefpane-${config.addonRef}-input`,
    )
    ?.addEventListener("change", (e) => {
      ztoolkit.log(e);
      addon.data.prefs!.window.alert(
        `Successfully changed to ${(e.target as HTMLInputElement).value}!`,
      );
    });

  await renderLock.promise;
  ztoolkit.log("Preference table rendered!");
}
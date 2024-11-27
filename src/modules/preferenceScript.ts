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

async function updatePrefsUI() {
  const renderLock = ztoolkit.getGlobal("Zotero").Promise.defer();
  const prefs = addon.data.prefs;
  if (prefs === undefined || prefs.window == undefined) return;

  const prefsWindow = prefs.window;
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
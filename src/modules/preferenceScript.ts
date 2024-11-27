import { config } from "../../package.json";
import { getString } from "../utils/locale";

export async function registerPrefsScripts(_window: Window) {
  ztoolkit.log("registerPrefsScripts", { prefs: addon.data.prefs })
  if (!addon.data.prefs) {
    addon.data.prefs = {
      window: _window,
      enableMarker: false,
      marker: {
        url: "",
        apiKey: "",
      },
      openWebUI: {
        url: "",
        apiKey: "",
      },
    };
  } else {
    addon.data.prefs.window = _window;
  }
  bindPrefEvents();
}

function bindPrefEvents() {
  const prefs = addon.data.prefs!;
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

    prefs.enableMarker = checked;
    updateMarkerEnableStatus(checked);
  });

  ztoolkit.log({ enableMarker: prefs.enableMarker, markerCheckbox });
  markerCheckbox.checked = prefs.enableMarker;
  updateMarkerEnableStatus(prefs.enableMarker);

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
}

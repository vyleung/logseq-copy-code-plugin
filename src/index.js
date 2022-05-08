import "@logseq/libs";
import { setDriftlessTimeout } from "driftless";

const settings = [
  {
    key: "IconTopPosition",
    title: "Edit the top position of the copy code icon",
    description: "Default: -1em. To move the copy code icon lower, insert a more positive number (e.g. 0em). To move the copy code icon higher, insert a more negative number (e.g. -2em)",
    type: "string",
    default: "-1em"
  }
]
logseq.useSettingsSchema(settings);

const copy_icon = `<svg id="copy-icon" xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-copy" width="22" height="22" viewBox="0 0 24 24" stroke-width="2" stroke="var(--ls-primary-text-color)" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
  <rect x="8" y="8" width="12" height="12" rx="2" />
  <path d="M16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2" />
</svg>`;
const copied_icon = `<svg id="copied-icon" xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-check" width="22" height="22" viewBox="0 0 24 24" stroke-width="2" stroke="#009900" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
  <path d="M5 12l5 5l10 -10" />
</svg>`;
const plugin_prefix = "#logseq-copy-code-plugin--copy-code";
let code_blocks;
let code_block_uuid;

const main = async () => {
  console.log("logseq-copy-code-plugin loaded");

  logseq.DB.onChanged(() => {
    insertCopyCodeButton();
  });

  function insertCopyCodeButton() {
    // get all code blocks
    code_blocks = parent.document.querySelectorAll(".code-editor > textarea");

    // for each code block, get the uuid of the block that it's in
    code_blocks.forEach(code_block => {
      // for plugin dev
      if (code_block.parentElement.offsetParent.offsetParent.offsetParent.classList.contains("ls-block")) {
        code_block_uuid = code_block.parentElement.offsetParent.offsetParent.offsetParent.classList[1];
      }
      // for plugin prod
      else if (code_block.parentElement.offsetParent.offsetParent.classList.contains("ls-block")) {
        code_block_uuid = code_block.parentElement.offsetParent.offsetParent.classList[1];
      }
      else {
        console.log("logseq-copy-code-plugin: ERROR - Cannot find code block's uuid");
      }

      // copy code button (its ID is the ID of the textarea that contains the content of the code block)
      logseq.provideUI({
        key: `copy-code-${code_block_uuid}`,
        path: `#block-content-${code_block_uuid} > .block-body > .cp__fenced-code-block > div > .extensions__code`,
        template: 
        `
        <a class="button copy-button" id="copy-code-${code_block.id}" data-on-click="copy_code" style="display:flex; position:absolute;">
          ${copy_icon}
        </a>
        `
      });

      // container for copy code button
      logseq.provideStyle(`
        ${plugin_prefix}-${code_block_uuid} {
          position: absolute;
          z-index: 99;
          height: 0;
          top: ${logseq.settings.IconTopPosition};
          right: 0;
        }
      `)
    });
  }
  insertCopyCodeButton();

  logseq.provideModel({
    copy_code(e) {
      let code_block_copy_button_id = e.id;

      // necessary to have the window focused in order to copy the content of the code block to the clipboard
      window.focus();

      // get the content of the code block and copy it to the clipboard
      let code_block_textarea = parent.document.getElementById(code_block_copy_button_id.split("copy-code-")[1]);
      navigator.clipboard.writeText(code_block_textarea.value);

      // change the icon from copy to copied, then back to copy
      let code_block_copy_icon = parent.document.getElementById(code_block_copy_button_id);
      code_block_copy_icon.innerHTML = copied_icon;
      setDriftlessTimeout(() => {
        code_block_copy_icon.innerHTML = copy_icon;  
      }, 750);
    }
  });
}

logseq.ready(main).catch(console.error);
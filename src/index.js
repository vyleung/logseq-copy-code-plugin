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
let code_blocks;
let code_block_uuid;
let code_block_parent;

const main = async () => {
  console.log("logseq-copy-code-plugin loaded");

  // doesn't detect when block is being edited (requires a new block to be added or a block's collapsed state to be toggled to run the function) - current workaround is to use mutation observer
  // logseq.DB.onChanged(() => {
  //   insertCopyCodeButton();
  // });

  // ref for mutation observer: https://github.com/xxchan/logseq-deadline-countdown/blob/a6cd2265b3f52d708341b47fca6e747c5c1506f8/index.js#L25-L44
  const mutation_observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const added_node of mutation.addedNodes) {
        if (added_node.querySelectorAll) {
          // after exiting the code block editor, insert the copy code button
          const code_mirror = added_node.querySelectorAll(".CodeMirror");
          for (const code of code_mirror) {
            insertCopyCodeButton();
          }
        }
      }
    }
  });
  mutation_observer.observe(parent.document.body, {
    childList: true,
    subtree: true
  });
  logseq.beforeunload(async () => {
    mutation_observer.disconnect();
  });

  function insertCopyCodeButton() {
    // get all code blocks
    code_blocks = parent.document.querySelectorAll(".code-editor > textarea");

    // for each code block, get the uuid of the block that it's in
    code_blocks.forEach(code_block => {
      // for plugin dev
      if (code_block.parentElement.offsetParent.offsetParent.offsetParent.classList.contains("ls-block")) {
        code_block_uuid = code_block.parentElement.offsetParent.offsetParent.offsetParent.classList[1];

        // .extensions__code
        code_block_parent = code_block.parentElement.offsetParent;
      }
      // for plugin prod
      else if (code_block.parentElement.offsetParent.offsetParent.classList.contains("ls-block")) {
        code_block_uuid = code_block.parentElement.offsetParent.offsetParent.classList[1];

        // .extensions__code
        code_block_parent = code_block.parentElement.offsetParent;
      }
      else {
        console.log("logseq-copy-code-plugin: ERROR - Cannot find code block's uuid");
      }
      
      // add an ID (that's the ID of the textarea that contains the content of the code block) to div.extensions__code to differentiate multiple code blocks within one block
      code_block_parent.id = `copy-code-${code_block.id}`;
      
      // inserts copy code button
      logseq.provideUI({
        key: `${code_block_parent.id}`,
        path: `#block-content-${code_block_uuid} > .block-body > .cp__fenced-code-block > div > #${code_block_parent.id}`,
        template: 
        `
        <a class="button copy-button" id="${code_block_parent.id}-button" data-on-click="copy_code" style="display:flex; position:absolute;">
          ${copy_icon}
        </a>
        `
      });

      // style container for copy code button
      logseq.provideStyle(`
        #logseq-copy-code-plugin--${code_block_parent.id} {
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
      let code_block_textarea = parent.document.getElementById(code_block_copy_button_id.split("copy-code-")[1].split("-button")[0]);
      navigator.clipboard.writeText(code_block_textarea.value);

      // change the icon from copy to copied, then back to copy
      let code_block_copy_icon = parent.document.getElementById(`${code_block_copy_button_id}`);
      code_block_copy_icon.innerHTML = copied_icon;
      setDriftlessTimeout(() => {
        code_block_copy_icon.innerHTML = copy_icon;  
      }, 750);
    }
  });
}

logseq.ready(main).catch(console.error);
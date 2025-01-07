import "@logseq/libs";
import { setDriftlessTimeout } from "driftless";

const settings = [
  {
    key: "IconTopPosition",
    title: "Edit the top position of the copy code icon",
    description: "Default: -1em. To move the copy code icon lower, insert a more positive number (e.g. 0em). To move the copy code icon higher, insert a more negative number (e.g. -2em)",
    type: "string",
    default: "-1em"
  },
  {
    key: "IconRightPosition",
    title: "Edit the right position of the copy code icon",
    description: "Default: 0em. To move the copy code icon to the right, insert a more positive number (e.g. 1em). To move the copy code icon to the left, insert a more negative number (e.g. -1em)",
    type: "string",
    default: "0em"
  },
  {
    key: "DisableInlineCopyButton",
    title: "Don't show inline copy code cutton",
    description:
      "Check this box if you don't want copy code button next to inline code.",
    default: false,
    type: "boolean",
    enumPicker: "checkbox",
  },
  {
    key: "AlwaysShowInlineCopyButton",
    title: "Always show inline copy code button?",
    defaul      "Check the box if you would like the copy code button to always show next to inline code. If unchecked, the copy code button will only appear when hovering over the inline code. Note: This option is obsolete when DisableInlineCopyButton is checked.",
t: false,
    type: "boolean",
    enumPicker: "checkbox"
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
let inline_codes;
let inline_code_uuid;
let prefix;

const main = async () => {
  console.log("logseq-copy-code-plugin loaded");

  // doesn't detect when block is being edited (requires a new block to be added or a block's collapsed state to be toggled to run the function) - current workaround is to use mutation observer
  // logseq.DB.onChanged(() => {
  //   insertCopyCodeButton_CodeBlock();
  // });

  // ref for mutation observer: https://github.com/xxchan/logseq-deadline-countdown/blob/a6cd2265b3f52d708341b47fca6e747c5c1506f8/index.js#L25-L44
  const mutation_observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const added_node of mutation.addedNodes) {
        if (added_node.querySelectorAll) {
          // after exiting the code block editor, insert the copy code button
          const code_mirror = added_node.querySelectorAll(".CodeMirror");
          for (const code of code_mirror) {
            insertCopyCodeButton_CodeBlock();
          }

          if (!logseq.settings.DisableInlineCopyButton) {
            // after exiting edit mode, insert the copy copy button next to inline code
            const inline_code_text = added_node.querySelectorAll(
              ".content :not(pre) > code",
            );
            for (const text of inline_code_text) {
              insertCopyCodeButton_InlineCode();
            }
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

  function insertCopyCodeButton_CodeBlock() {
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
        <a class="button copy-button" id="${code_block_parent.id}-button" data-on-click="copy_code_codeBlock" style="display:flex; position:absolute;">
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
          right: ${logseq.settings.IconRightPosition};
        }
      `)
    });
  }
  insertCopyCodeButton_CodeBlock();

  function insertCopyCodeButton_InlineCode() {
    inline_codes = parent.document.querySelectorAll(".content :not(pre) > code");

    // for each inline code, get the uuid of the block that it's in
    inline_codes.forEach(inline_code => { 
      if (inline_code.id == "") {
        // generate a string w/ 7 random letters and numbers as the prefix for the inline code's id
        prefix = `copy-code-${(Math.random() + 1).toString(36).substring(5)}-prefix`;

        // for plugin dev
        if (inline_code.parentElement.offsetParent.parentElement.parentElement.classList.contains("ls-block") && inline_code.parentElement.classList.contains("inline")) {
          inline_code_uuid = inline_code.parentElement.offsetParent.parentElement.parentElement.classList[1];
        }
        // for plugin prod
        else if (inline_code.parentElement.offsetParent.classList.contains("ls-block") && inline_code.parentElement.classList.contains("inline")) {
          inline_code_uuid = inline_code.parentElement.offsetParent.classList[1];
        }

        // add an ID to differentiate multiple inline code within one block
        inline_code.id = `${prefix}-${inline_code_uuid}`;

        // insert copy code button
        logseq.provideUI({
          key: `${inline_code.id}`,
          path: `#${inline_code.id}`,
          template: 
          `
          <a class="button copy-button" id="${inline_code.id}-button" data-on-click="copy_code_inlineBlock" style="padding: 0; margin-left: 0.25em; border-bottom-color: transparent !important; background-color: transparent;">
            ${copy_icon}
          </a>
          `
        });

        // style container for copy code button
        logseq.provideStyle(`
          #logseq-copy-code-plugin--${inline_code.id} {
            display: inline-flex;
            position: relative;
            z-index: 99;
            height: 0;
            vertical-align: top;
            top: 0.15em;
          }
        `)

        // always show the copy button for inline code
        if (logseq.settings.AlwaysShowInlineCopyButton) {
          logseq.provideStyle(`
            #${inline_code.id}-button {
              display: inline-flex;
            }
          `)
        }
        // show copy button for inline code on hover
        else {
          logseq.provideStyle(`
            #${inline_code.id}-button {
              display: none;
            }
          `)
          // hovering over an inline code shows a copy code button; leaving the code hides the button
          parent.document.getElementById(`${inline_code.id}`).addEventListener("mouseover", function () {
            if (parent.document.getElementById(`${inline_code.id}-button`) != "null") {
              parent.document.getElementById(`${inline_code.id}-button`).style.display = "inline-flex";
            }
            else {
              console.log("logseq-copy-code-plugin: ERROR - Cannot find inline code (A)");
            }
          });
          parent.document.getElementById(`${inline_code.id}`).addEventListener("mouseout", function () {
            if (parent.document.getElementById(`${inline_code.id}-button`) != "null") {
              parent.document.getElementById(`${inline_code.id}-button`).style.display = "none";
            }
            else {
              console.log("logseq-copy-code-plugin: ERROR - Cannot find inline code (B)");
            }
          });
        }
      }
    });
  }
  insertCopyCodeButton_InlineCode();

  logseq.provideModel({
    copy_code_codeBlock(e) {
      // necessary to have the window focused in order to copy the content of the code block to the clipboard
      window.focus();

      let code_block_copy_button_id = e.id;

      // get the content of the code block and copy it to the clipboard
      let code_block_textarea = parent.document.getElementById(code_block_copy_button_id.split("copy-code-")[1].split("-button")[0]);
      navigator.clipboard.writeText(code_block_textarea.value);

      // change the icon from copy to copied, then back to copy
      let code_block_copy_icon = parent.document.getElementById(`${code_block_copy_button_id}`);
      code_block_copy_icon.innerHTML = copied_icon;
      setDriftlessTimeout(() => {
        code_block_copy_icon.innerHTML = copy_icon;  
      }, 750);
    },
    copy_code_inlineBlock(e) {
      // focus the window
      window.focus();

      let inline_code_copy_button_id = e.id;
      
      // get the content of the inline code and copy it to the clipboard
      let inline_code_content = parent.document.getElementById(inline_code_copy_button_id.split("-button")[0]).innerText;
      navigator.clipboard.writeText(inline_code_content);

      // change the icon from copy to copied, then back to copy
      let inline_code_copy_icon = parent.document.getElementById(`${inline_code_copy_button_id}`);
      inline_code_copy_icon.innerHTML = copied_icon;
      setDriftlessTimeout(() => {
        inline_code_copy_icon.innerHTML = copy_icon;  
      }, 750);
    }
  });
}

logseq.ready(main).catch(console.error);

// ==UserScript==
// @name         Shortcut.com
// @match        https://app.shortcut.com/*
// @include      https://app.shortcut.com/*/story/*
// @include      https://app.shortcut.com/*/epic/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=shortcut.com
// @grant        none
// ==/UserScript==

// This script hides some Shortcut things that are not useful for me.
// It also add some more Trello-like keyboard shortcuts.

;(function () {
  console.log("Loading custom Shortcut extension...")
  ;("use strict")
  const $ = window.$

  // Add a spacer element for later use
  $("body").append('<div id="custom-spacer" style="margin-top: 100px"></div>')

  function getLabelsButton() {
    return $(
      ".add-new-dialog.add-new-story button.add-labels, .story-container #story-dialog-add-label-dropdown"
    )
  }

  function hideShortcutStuff() {
    // Story: permalink -- I just command-k to the URL
    // This is only present on the edit view
    $(".story-container .story-attributes > div:nth-child(2)").hide()

    const $newStoryContainer = $(".add-new-dialog.add-new-story")
    const $editStoryContainer = $(".story-container")
    const $newStoryAttributes = $newStoryContainer.find(".story-attributes")
    const $editStoryAttributes = $editStoryContainer.find(".story-attributes")

    // Story: hide iteration editing -- we don't use iterations
    $newStoryAttributes.find(".story-iteration").hide()
    $editStoryAttributes.find(".story-iteration").hide()

    // Story: hide followers -- kind of pointless
    $newStoryAttributes.find(".story-followers").hide()
    $editStoryAttributes.find(".story-followers-container").hide()

    // Story: hide requester -- I don't typically care who requested the story
    $newStoryAttributes
      .find('[data-component-key="AddStoryRequesterField"]')
      .hide()
    $editStoryAttributes.find('[data-component-key="RequesterField"]').hide()

    // Move labels a bit higher
    $newStoryAttributes
      .find(".labels-container")
      .insertAfter("#addStoryOwnerRequester")
    $editStoryAttributes
      .find(".labels-container")
      .insertAfter("#updateStoryRequesterOwnerFields")

    // Move story state next to owner (makes more sense to me)
    $newStoryAttributes
      .find("#add-new-story-workflow-state")
      .insertAfter($newStoryAttributes.find("#addStoryOwnerRequester"))
    $editStoryAttributes
      .find("#story-dialog-state-dropdown")
      .insertAfter(
        $editStoryAttributes.find("#updateStoryRequesterOwnerFields")
      )

    // Add a space before some non-critical elements
    // TODO: this won't work since we're inserting the same element before a non-existent if editing
    $("#custom-spacer").insertBefore($newStoryAttributes.find(".story-points"))
    $("#custom-spacer").insertBefore(
      $editStoryAttributes.find("#story-dialog-estimate-dropdown")
    )

    // Avoid label button still having focus after closing label edit with esc (Shortcut bug?)
    // This enables us to use keyboard shortcuts.
    getLabelsButton().blur()
  }

  $("body").keypress(function (e) {
    // https://stackoverflow.com/questions/38583773
    // skip if currently editing a text input (label, title, description, etc.)
    if ($(e.target).is(":input, [contenteditable]")) {
      return
    }
    // console.log("e.keyup: ", e.key);
    // console.log(e);
    if (e.key === "e") {
      $(
        ".story-container .description-container button.edit-description:visible"
      ).click()
    } else if (e.key === "t") {
      // edit title keyboard shortcut
      // only do this if we can see this (otherwise use story template creator)
      const $storyName = $(".story-container h2.story-name")
      if ($storyName.is(":visible")) {
        $storyName.click()
        // don't add 't' to the text field; also stop the default Shortcut 't' shortcut of 'new story from template'
        return false
      }
    } else if (e.key === "l") {
      const $labelsButton = getLabelsButton()
      if ($labelsButton) {
        $labelsButton.click()
        // don't add 'l' to the text field
        return false
      }
    } else if (e.key === "c") {
      $("button[data-on-click='App.Controller.AddNewStory.render']").click()
      // don't add 'c' to the new story title
      return false
    }
  })

  // do this frequently so we hide stuff each time we view a story
  setInterval(hideShortcutStuff, 500)

  // better for debugging since HTML is consistently changing
  // setTimeout(hideShortcutStuff, 500);
  // setTimeout(hideShortcutStuff, 1000);
  // setTimeout(hideShortcutStuff, 1500);
  // setTimeout(hideShortcutStuff, 2000);

  console.log("Loaded custom Shortcut extension!")
})()

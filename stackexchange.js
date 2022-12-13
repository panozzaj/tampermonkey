// ==UserScript==
// @name          StackExchange cleanup
// @description   Remove some elements on StackExchange pages
// @include       https://stackoverflow.com/*
// @include       https://meta.stackoverflow.com/*
// @include       https://superuser.com/*
// @include       https://meta.superuser.com/*
// @include       https://serverfault.com/*
// @include       https://meta.serverfault.com/*
// @include       https://askubuntu.com/*
// @include       https://meta.askubuntu.com/*
// @include       https://answers.onstartups.com/*
// @include       https://meta.answers.onstartups.com/*
// @include       https://nothingtoinstall.com/*
// @include       https://meta.nothingtoinstall.com/*
// @include       https://seasonedadvice.com/*
// @include       https://meta.seasonedadvice.com/*
// @include       https://crossvalidated.com/*
// @include       https://askdifferent.com/*
// @include       https://meta.crossvalidated.com/*
// @include       https://stackapps.com/*
// @include       https://*.stackexchange.com/*
// @exclude       https://chat.stackexchange.com/*
// @exclude       https://api.*.stackexchange.com/*
// @exclude       https://data.stackexchange.com/*
// @exclude       https://area51.stackexchange.com/*
// @require       http://code.jquery.com/jquery-latest.min.js
// @grant        none
// @match        */questions/*
// ==/UserScript==


// This cleans up the StackOverflow site to be quite clean.
// It hides a bunch of elements on the page to make it just
// be the question and answers.
//
// Note: this currently breaks upvoting and commenting and things.
// If you want to do that, just disable the script and reload.


console.log('here in StackOverflow cleanup script');

var $ = window.jQuery;
var SEsuccess = false;

function hideStuff() {
    SEsuccess = true;

    //$('body').css({ 'background-color': '#fdf0f2' });

    // top bar stuff hiding
    $('.user-logged-in').hide();
    $('.-marketing-link').hide();

    // hide header and footer
    $('header').hide();
    $('footer').hide();

    // Ask a question button
    $('.aside-cta').hide();

    $("#hot-network-questions").hide();
    $('#hireme').hide();
    $('.everyonelovesstackoverflow').hide();
    $(".community-bulletin").hide();
    $('.module.community-bulletin').hide();
    $('#js-gdpr-consent-banner').hide();
    $('.js-consent-banner').hide();
    $('.js-dismissable-hero').hide();

    // hide left sidebar
    $('.left-sidebar').hide();

    // expand main content
    $('#mainbar').css('width', '100%');
    $('#content').css('width', '100%');
    $('#content').css('border', 'none');

    $('#newsletter-ad').hide(); // some random ad thing
    $('.user-gravatar32').hide(); // poster/answerer profile images
    $('.badgecount, .badge1, .badge2, .badge3').hide();

    // RIGHT SIDEBAR
    // push to bottom of page and expand
    $('#sidebar').css({ float: 'none', width: '600px'});

    // remove StackOverflow promotions
    $('.mb16').hide()

    // remove spacer element
    $('.js-sidebar-zone').hide();

    // random survey popup
    $('.js-toast').hide();

    // remove chat element
    $('.js-chat-ad-rooms').hide();
    $('#chat-feature').hide();
    // END RIGHT SIDEBAR
}

hideStuff();
setTimeout(hideStuff, 100);
setTimeout(hideStuff, 250);
setTimeout(hideStuff, 500);
setTimeout(hideStuff, 1000);
setTimeout(hideStuff, 1500);
setTimeout(hideStuff, 2000);

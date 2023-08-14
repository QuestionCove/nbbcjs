# Introduction

- [Introduction](#introduction)
  - [Overview](#overview)
  - [What is BBCode?](#what-is-bbcode)
  - [Useful Features](#useful-features)
  - [Why BBCode?](#why-bbcode)
  - [Why NBBC?](#why-nbbc)

## Overview

The New BBCode Parser (NBBC) is a fully-validating, high-speed, extensible parser for the BBCode document language, written in TypeScript, compatible with Browser and Node >= 16. It converts BBCode input into HTML output, and can guarantee that the output will be fully conformant to the HTML5 standard no matter how badly-mangled the BBCode input is.

## What is BBCode?

BBCode is a document-formatting language, similar to HTML, only designed to be much simpler to use. BBCode was popularized by various forum and bulletin-board services throughout the late 1990s and early 2000s, and is now a de-facto standard; however, most BBCode parsers, which convert that BBCode into displayable HTML, are non-validating, meaning that they do not guarantee that their output will necessarily be "good" HTML. Some are so over-simplified that they are vulnerable to a number of security attacks. NBBC is designed to be an easy drop-in replacement for most existing BBCode parsers, and is designed to be both validating and secure.

## Useful Features

- Output is always HTML5 conformant.
- Output is protected against many common user-input attacks, such as XSS attacks.
- Emoji, such as :-), are converted into \<img> tags, and a large library of common emoji images is included.
- Includes a library supporting all the standard BBCode codes found on most popular bulletin boards and web forums.
- Supports "wiki links," which can be an easy way for users to reference wiki pages on your site if you also have a wiki installed.
- The list of codes is fully extensible; you can add and remove codes at any time.
- Tightly encapsulated in classes and doesn't pollute the global namespace, so it's easy to drop into existing environments.
- The standard library includes support for not only extremely common tags like [b] and [i], but also supports nearly all the tags found on most major forums and bulletin boards: [center], [list], [code], and [quote], among others, with all their various flags and parameters.
- Best of all, it's free! NBBC is covered under the New BSD Open-Source License, so it can be used anywhere, anywhen, in any project, for any reason.

## Why BBCode?

You may be asking yourself: Why does my web application need BBCode? What does BBCode do for me that HTML doesn't do? If you're asking these kinds of questions, this is the section for you. BBCode is a document formatting language, just like HTML, but in many ways it's better than HTML for your user-generated content:

- **BBCode is simpler.** HTML is a big, hoary, complex language with tons of caveats, side effects, and security issues. HTML can take weeks or months to learn well, whereas most of the BBCode features people will ever use can be learned fully in an afternoon. Newlines behave as newlines, Emoji behave as Emoji, and generally the language is user-friendly and newbie-friendly right out of the box.
- **BBCode is safer.** HTML has plenty of security holes, from \<script> tags to javascript: URLs to XSS attacks and more. BBCode, on the other hand, is a simple language that does most the tasks that most people need, without all the security troubles: BBCode actively prohibits tags and constructs that can get you into trouble, and even repairs bad code on the fly.
- **BBCode is flexible.** HTML knows how to do what it does, and that's it; if you want a new element in HTML, say, a \<quote> element or a \<multicol> element, you have to wait and hope that all the major browsers implement what you need --- if they don't implement it, you don't have it. With BBCode, you can define simple tags that produce big, complex HTML on the backend, so that a tag like [calendar=2008-07] really can produce a working calendar, even if no browsers have a built-in \<calendar> element.
- **BBCode is portable.** Again, with HTML, you're limited to what the browsers support. But since BBCode is translated to a very simple subset of HTML, even really complicated BBCode constructs can work on just about any browser. Not so with the full power of HTML, where a lot of stuff just plain doesn't work if you switch from Firefox to Internet Explorer and back.
- **BBCode follows its users mental models.** With HTML, there's a longstanding argument over visual styles vs. logical styles, whether your document should be formatted for machine use with elements like \<strong> or formatted for visuals with elements like \<b>. BBCode doesn't care: It implements whatever tags you want it to implement, whatever make the most sense for your needs. Need a [flash] tag, or a [video] tag, or a [webcomic=]...[/webcomic] link? Add it so that the language does what you want it to do, and not the other way around.
- **BBCode is automatically and easily styled.** Since all BBCode gets compiled to a simple subset of HTML, changing the look-and-feel of BBCode content can be done by changing just a very small handful of CSS styles. Not so with HTML, where there are often hundreds of classes in even a relatively short document.

In fairness, BBCode isn't perfect. Let's look at what it can't do too, compared to HTML:

- **HTML is faster.** BBCode needs to be compiled, and that takes time on your server or client. But NBBC is designed to be a very fast compiler, and even long BBCode documents can be formatted rapidly with it.
- **HTML supports lots of extras.** Scripts, forms, embedded objects, video... if the web can do it, HTML can do it. BBCode intentionally leaves out this flexibility in exchange for safety, but with NBBC, you can always add these kinds of elements back in if you really need them.
- **HTML more flexible about its look and feel.** BBCode intentionally restricts its content to all look the same, to share the same styles, while HTML can have any look anywhere.
- **HTML can and will grow.** BBCode only can do what your BBCode library (NBBC) can do, whereas HTML will get new features over time as people upgrade their browsers.

Still, even with the advantages HTML has, in a security- and safety-conscious age, BBCode is the clear winner for user-generated content. If you're letting your users add any kind of text-based content to your site, your site needs BBCode, and NBBC is the best and easiest way to get it.

## Why NBBC?

So if you're convinced that BBCode is right for your application, you still may be wondering why you should use NBBC instead of another BBCode library, or instead of just rolling your own solution. We believe NBBC is better:

- **NBBC is correct and compliant.** Unlike many other libraries (and definitely unlike many roll-your-own solutions), NBBC's output is compatible with the restrictions of HTML5: The output HTML is correctly-structured no matter how badly-mangled the user's input is, so even the ugliest damaged input can still pass an HTML5 validation test.
- **NBBC is fast.** Built on a solid foundation of compiler technologies, NBBC can compete with the best BBCode-parsing solutions that you can implement, and can sometimes even outperform a simple `String.replace()`-based solution!
- **NBBC is lightweight.** You can easily implement NBBC in any environment by including a single JavaScript source file, or importing it from NPM. Drop it in and away you go!
- **NBBC is easy to use.** Adding basic support for BBCode in your application can be done in only three lines of code. Why limit your users to plain text or implement complicated HTML validation when you can add sophisticated formatting in three lines of code?
- **NBBC implements most common BBCode tags.** Right out of the box, you have support for everything from common tags like [b] and [i] to sophisticated tags like [code] and [quote] and even [columns]. For most needs, you won't need to add or change a thing.
- **NBBC supports Emoji!** Not all BBCode parsers support Emoji (Emoticons/Smileys) directly, and fewer still include 30 of the most commonly-used ones right out of the box! You can always add your own custom Emoji, but for a lot of purposes, NBBC's built-in Emoji will be all you'll ever need.
- **NBBC is extensible.** If NBBC doesn't have the tags you want or need for your environment, they're incredibly easy to add with its sophisticated API. Many tags can be added in only a few lines of code!
- **NBBC is well-documented.** Not only is the source-code well-commented and designed to be easy to read, there is lots of documentation describing how to use NBBC and its features.
- **NBBC is tested.** NBBC has a large regression-test suite that is designed to ensure its correctness: While most other BBCode solutions are content to just swap a tag for a tag, NBBC is designed with predictability, security, and stability in mind, so you can ensure that its output is safe and correct no matter what input your users provide.

Fast, powerful, clean, flexible, and lightweight: NBBC is designed to be the perfect BBCode-processing library.

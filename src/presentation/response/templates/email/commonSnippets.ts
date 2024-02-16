// noinspection CssUnresolvedCustomProperty

import {BASE_URL, DOMAIN_NAME} from "@/src/constants.js";


export function commonEmailTemplate(title: string, bodySlot: string, headSlot: string = "") {
    return `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        /* http://meyerweb.com/eric/tools/css/reset/ 
           v2.0 | 20110126
           License: none (public domain)
        */
        
        html, body, div, span, applet, object, iframe,
        h1, h2, h3, h4, h5, h6, p, blockquote, pre,
        a, abbr, acronym, address, big, cite, code,
        del, dfn, em, img, ins, kbd, q, s, samp,
        small, strike, strong, sub, sup, tt, var,
        b, u, i, center,
        dl, dt, dd, ol, ul, li,
        fieldset, form, label, legend,
        table, caption, tbody, tfoot, thead, tr, th, td,
        article, aside, canvas, details, embed, 
        figure, figcaption, footer, header, hgroup, 
        menu, nav, output, ruby, section, summary,
        time, mark, audio, video {
            margin: 0;
            padding: 0;
            border: 0;
            font-size: 100%;
            font: inherit;
            vertical-align: baseline;
        }
        /* HTML5 display-role reset for older browsers */
        article, aside, details, figcaption, figure, 
        footer, header, hgroup, menu, nav, section {
            display: block;
        }
        body {
            line-height: 1;
        }
        ol, ul {
            list-style: none;
        }
        :root {
            --primary-color: #0288d1;
            --primary-color-dark: #005b9f;
            --secondary-color: #43a047;
            --on-primary-color: white;
            --on-secondary-color: white;
        }
        
        [color-scheme=light] {
            /*General*/
            --background-color: white;
            --on-background-color: black;
            --on-background-color-inverse: white;
            --primary-faint-color: #F0F9Fe;
            --secondary-faint-color: #F3FFF3FF;
        }
        
        [color-scheme=black] {
            /*General*/
            --background-color: black;
            --on-background-color: white;
            --on-background-color-inverse: black;
            --primary-faint-color: #0a1c2a;
            --secondary-faint-color: #0A150AC6;
        }
        * {
            font-family: Verdana, Geneva, Tahoma, sans-serif;
            box-sizing: border-box;
        }
        
        body {
            background-color: var(--background-color);
            color: var(--on-background-color);
        }
        
        header {
            position: sticky;
            top: 0;
            z-index: 5;
            margin-bottom: 1rem;
        }
        
        .main-header {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            padding: 0 2vw;
            background-color: var(--primary-color)
        }
        
        .inv-link {
            color: var(--on-background-color);
            text-decoration: none;
        }
        
        .inv-link:hover {
            text-decoration: underline;
        }
        
        
        .title {
            display: flex;
            align-items: center;
            column-gap: .5rem
        }
        
        .title h1 {
            color: var(--on-primary-color);
            font-family: Verdana, sans-serif;
            font-weight: 700;
            font-size: 2rem;
            padding: 1rem 0
        }
        
        .title:hover {
            text-decoration: none
        }
        
        main {
            display: flex;
            flex-direction: column;
            row-gap: 1.5rem;
            align-items: center;
        }
        
        main p {
            align-self: flex-start;
        }
        
        .link-button {
            background: var(--secondary-color);
            border: 1px solid var(--secondary-color);
            padding: 0;
            border-radius: 3px;
            font-weight: bold;
            cursor: pointer;
            font-size: 1rem;
        }
        
        .link-button>a {
            display: inline-block;
            color: var(--on-secondary-color);
            padding: 10px 20px;
        }
    </style>
    ${headSlot}
</head>

<body color-scheme="light">
<header><div class="main-header"><a href="${BASE_URL}" class="title inv-link"><h1>Dzelda</h1></a></div></header>
<main>
${bodySlot}
</main>
</body>
</html>
    `;
}

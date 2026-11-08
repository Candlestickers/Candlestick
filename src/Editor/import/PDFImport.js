import * as pdfjsLib from "pdfjs-dist";

const BASE = (process.env.PUBLIC_URL && process.env.PUBLIC_URL !== "/") ? process.env.PUBLIC_URL : "";
pdfjsLib.GlobalWorkerOptions.workerSrc = `${BASE}/pdf.worker.min.mjs`;

export async function importPDFAsSequence({ pdfFile, scale = 2, onProgress = () => { } }) {
    const buf = await pdfFile.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise

    const pages = []
    const total = pdf.numPages

    let width = null
    let height = null

    for (let i = 1; i <= total; i++) {
        onProgress(`Rendering page ${i}/${total}`, (i / total) * 100)

        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale })

        if (i === 1) {
            width = Math.round(viewport.width)
            height = Math.round(viewport.height)
        }

        const canvas = document.createElement("canvas")
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)

        const ctx = canvas.getContext("2d")
        await page.render({ canvasContext: ctx, viewport }).promise

        const blob = await new Promise(res => canvas.toBlob(res, "image/png"))
        pages.push(new File([blob], `page${i}.png`, { type: "image/png" }))
    }

    return { pageFiles: pages, width, height }
}

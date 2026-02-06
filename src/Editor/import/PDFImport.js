import * as pdfjsLib from "pdfjs-dist"
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url"

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

export async function importPDFAsSequence({
    pdfFile,
    scale = 2,
    onProgress = () => { }
}) {
    const buf = await pdfFile.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise

    const pages = []
    const total = pdf.numPages

    for (let i = 1; i <= total; i++) {
        onProgress(`Rendering page ${i}/${total}`, (i / total) * 100)

        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement("canvas")
        canvas.width = viewport.width
        canvas.height = viewport.height

        const ctx = canvas.getContext("2d")
        await page.render({ canvasContext: ctx, viewport }).promise

        const blob = await new Promise(res => canvas.toBlob(res, "image/png"))

        pages.push(
            new File([blob], `page${i}.png`, { type: "image/png" })
        )
    }

    return pages
}

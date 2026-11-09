import EditorCore from './EditorCore'
import VideoExport from './export/VideoExport'

jest.mock('./export/VideoExport', () => ({ renderVideo: jest.fn() }))
jest.mock('./import/PDFImport', () => ({ importPDFAsSequence: jest.fn() }))

describe('video export UI recovery', () => {
  let editor
  beforeEach(() => {
    editor = new EditorCore()
    editor.state = { activeModalName: null }
    editor.project = {}
    editor.setState = jest.fn(update => Object.assign(editor.state, update))
    editor.openModal = jest.fn(name => { editor.state.activeModalName = name })
    editor.closeActiveModal = jest.fn(() => { editor.state.activeModalName = null })
    editor.hideWaitOverlay = jest.fn()
    editor.toast = jest.fn(() => 'export-toast')
    editor.updateToast = jest.fn()
    VideoExport.renderVideo.mockReset()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterEach(() => jest.restoreAllMocks())

  test.each([new Error('ffmpeg exited with code 1'), 'native export failed', undefined])
  ('handles rejection %p without leaving a stuck dialog', async error => {
    VideoExport.renderVideo.mockRejectedValue(error)
    await expect(editor.exportProjectAsVideo({})).resolves.toBeUndefined()
    expect(editor.state.exporting).toBe(false)
    expect(editor.state.renderProgress).toBe(0)
    expect(editor.state.activeModalName).toBe(null)
    expect(editor.hideWaitOverlay).toHaveBeenCalledTimes(1)
    expect(editor.updateToast).toHaveBeenCalledWith('export-toast', {
      type: 'error', text: expect.stringContaining('Video export failed'),
    })
    expect(console.error).toHaveBeenCalledWith('Video export failed:', error)
  })

  test('does not close another dialog opened while exporting', async () => {
    VideoExport.renderVideo.mockImplementation(async () => {
      editor.state.activeModalName = 'Settings'
      throw new Error('failed')
    })
    await editor.exportProjectAsVideo({})
    expect(editor.closeActiveModal).not.toHaveBeenCalled()
    expect(editor.state.exporting).toBe(false)
  })

  test('allows a successful retry after a failed export', async () => {
    VideoExport.renderVideo.mockRejectedValueOnce(new Error('failed'))
      .mockImplementationOnce(async args => {
        args.onProgress('Complete', 100)
        args.onFinish()
      })
    await editor.exportProjectAsVideo({})
    await editor.exportProjectAsVideo({})
    expect(editor.state.exporting).toBe(false)
    expect(editor.state.renderProgress).toBe(100)
    expect(editor.updateToast).toHaveBeenLastCalledWith('export-toast', {
      type: 'success', text: 'Successfully created .mp4 file.',
    })
    expect(editor.closeActiveModal).toHaveBeenCalledTimes(1)
  })
})

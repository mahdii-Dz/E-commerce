'use client'

import { useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'

const JoditEditor = dynamic(() => import('jodit-react'), { ssr: false })

export default function RichTextEditor({ content = '', onChange }) {
  const editorRef = useRef(null)

  const config = useMemo(() => ({
    direction: 'rtl',
    language: 'ar',
    readonly: false,
    height: 400,
    toolbarAdaptive: false,
    toolbarSticky: false,
    placeholder: 'اكتب المحتوى هنا...',
    buttons: [
      'undo', 'redo', '|',
      'bold', 'italic', 'underline', 'strikethrough', '|',
      'superscript', 'subscript', '|',
      'ul', 'ol', '|',
      'outdent', 'indent', '|',
      'font', 'fontsize', '|',
      'brush', '|',
      'paragraph', '|',
      'align', '|',
      'hr', 'eraser', '|',
      'fullsize',
    ],
    disablePlugins: ['image', 'video', 'table', 'link', 'file', 'source', 'print', 'speechify'],
    colors: {
      palette: [
        ['#000000', '#888888', '#ffffff', '#ff0000', '#FA3145'],
        ['#FF9900', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF'],
        ['#9900FF', '#FF00FF', '#FF6600', '#00CC66', '#3366FF'],
      ]
    },
    style: {
      fontFamily: 'Tajawal, system-ui, sans-serif',
      fontSize: '16px',
      lineHeight: '1.7',
    },
  }), [])

  return (
    <div className="rich-editor-wrapper" dir="rtl">
      <JoditEditor
        ref={editorRef}
        value={content}
        config={config}
        onChange={(newContent) => onChange(
          newContent.replace(/style="[^"]*background(?:-color)?:[^"]*"/gi, 'style=""')
            .replace(/style="\s*"/g, '')
        )}
      />
    </div>
  )
}

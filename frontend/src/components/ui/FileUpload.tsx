import { useCallback, useRef, useState, type DragEvent } from 'react'
import { motion } from 'framer-motion'
import { UploadCloud, FileCheck2, X } from 'lucide-react'

interface FileUploadProps {
  accept?: string
  multiple?: boolean
  label?: string
  hint?: string
  onFilesChange: (files: File[]) => void
  maxSizeMB?: number
}

export function FileUpload({
  accept,
  multiple = false,
  label = 'Drag & drop file here',
  hint,
  onFilesChange,
  maxSizeMB = 10,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    (incoming: FileList | File[]) => {
      const list = Array.from(incoming)
      const allowedFiles = list.filter((f) => f.size <= maxSizeMB * 1024 * 1024)
      const next = multiple ? [...files, ...allowedFiles] : allowedFiles.slice(0, 1)
      setFiles(next)
      onFilesChange(next)
    },
    [files, multiple, maxSizeMB, onFilesChange],
  )

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }

  const removeFile = (index: number) => {
    const next = files.filter((_, i) => i !== index)
    setFiles(next)
    onFilesChange(next)
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`group cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200 ${
          isDragging
            ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
            : 'border-white/15 bg-slate-950/40 hover:border-indigo-500/50 hover:bg-indigo-500/5'
        }`}
      >
        <motion.div
          animate={isDragging ? { y: -4, scale: 1.05 } : { y: 0, scale: 1 }}
          className="mx-auto flex flex-col items-center"
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-300">
            <UploadCloud size={24} />
          </div>
          <p className="text-sm font-medium text-slate-200">{label}</p>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
          <p className="mt-2 text-xs text-slate-600">
            or <span className="text-indigo-400 underline underline-offset-2">browse files</span>
          </p>
        </motion.div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {files.length > 0 ? (
        <div className="mt-3 space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileCheck2 size={16} className="shrink-0 text-emerald-400" />
                <span className="truncate text-sm text-slate-200">{file.name}</span>
                <span className="shrink-0 text-xs text-slate-500">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="rounded-md p-1 text-slate-400 transition hover:bg-white/10 hover:text-rose-300"
                aria-label={`Remove ${file.name}`}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

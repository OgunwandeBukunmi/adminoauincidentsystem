import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { uploadImages } from "../services/cloudinaryUpload"

const API = "http://localhost:5000/api/admin"

const STATUS = {
  pending: { label: "Pending", badge: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  approved: { label: "Approved", badge: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  rejected: { label: "Rejected", badge: "bg-rose-100 text-rose-800", dot: "bg-rose-500" },
}

// Maps the dropdown value to the backend route that sets it.
// NOTE: your backend has no "/pending" route yet - see the snippet in the chat reply.
const STATUS_ROUTE = { approved: "approve", rejected: "reject", pending: "pending" }

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      ...options.headers,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || `Request failed (${res.status})`)
    throw err
  }
  return data
}

function formatDate(value) {
  if (!value) return "—"
  const d = new Date(value)
  return isNaN(d) ? String(value) : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
}

function StatusBadge({ status }) {
  const s = STATUS[status] ?? STATUS.pending
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function Modal({ title, onClose, children, wide, extraWide, zIndex = "z-50" }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      className={`fixed inset-0 ${zIndex} flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full rounded-xl bg-white shadow-xl ${extraWide ? "max-w-4xl" : wide ? "max-w-2xl" : "max-w-lg"
          }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

const inputCls =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/30"

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

/* ---------- Select & Link Posts Modal ---------- */

function LinkPostsModal({ posts, categories, selectedLinks, onToggle, onClose }) {
  const [keyword, setKeyword] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const nonParentPosts = useMemo(() => {
    return posts.filter((p) => !p.isParentPost)
  }, [posts])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    return nonParentPosts.filter((p) => {
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false
      if (statusFilter !== "all" && p.status !== statusFilter) return false
      if (q) {
        const haystack = `${p.title ?? ""} ${p.post_message ?? ""} ${p.category ?? ""} ${p.incident_time_estimate ?? ""}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [nonParentPosts, keyword, categoryFilter, statusFilter])

  const selectAllFiltered = () => {
    filtered.forEach((p) => {
      if (!selectedLinks.includes(p.id)) {
        onToggle(p.id)
      }
    })
  }

  const deselectAllFiltered = () => {
    filtered.forEach((p) => {
      if (selectedLinks.includes(p.id)) {
        onToggle(p.id)
      }
    })
  }

  return (
    <Modal title="Link Incident Posts" onClose={onClose} extraWide zIndex="z-[60]">
      <div className="space-y-4">
        {/* Keywords & Filters */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              placeholder="Filter by keywords in title, description, category…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className={`${inputCls} pl-9`}
              autoFocus
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`${inputCls} sm:w-44`}
              aria-label="Filter by category"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`${inputCls} sm:w-36`}
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              {Object.entries(STATUS).map(([val, s]) => (
                <option key={val} value={val}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Counts & Bulk Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-800">{filtered.length}</span> of {nonParentPosts.length} posts
            <span className="ml-2.5 inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 font-medium text-teal-700">
              {selectedLinks.length} selected
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllFiltered}
              className="font-medium text-teal-700 hover:text-teal-800 hover:underline"
            >
              Select visible ({filtered.length})
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={deselectAllFiltered}
              className="font-medium text-slate-600 hover:text-slate-800 hover:underline"
            >
              Deselect visible
            </button>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-sm font-medium text-slate-600">No posts match your keyword or filters</p>
              <p className="mt-1 text-xs text-slate-400">Try modifying your search terms</p>
            </div>
          ) : (
            filtered.map((p) => {
              const isChecked = selectedLinks.includes(p.id)
              return (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-start gap-3 p-3.5 transition-colors hover:bg-slate-50 ${isChecked ? "bg-teal-50/50" : ""
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggle(p.id)}
                    className="mt-1 h-4 w-4 rounded accent-teal-700 cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">{p.title}</span>
                      <StatusBadge status={p.status} />
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                        {p.category}
                      </span>
                    </div>

                    {p.post_message && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">
                        {p.post_message}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      <span>Time: {p.incident_time_estimate || "—"}</span>
                      <span>•</span>
                      <span>Posted: {formatDate(p.createdAt)}</span>
                      {p.role && (
                        <>
                          <span>•</span>
                          <span className="capitalize">By: {p.role}</span>
                        </>
                      )}
                    </div>
                  </div>
                </label>
              )
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-3">
          <span className="text-sm text-slate-600">
            <strong className="font-semibold text-slate-900">{selectedLinks.length}</strong> post{selectedLinks.length === 1 ? "" : "s"} will be linked
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-teal-700 px-5 py-2 text-sm font-medium text-white hover:bg-teal-800 transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ---------- Create post / parent post ---------- */

function CreatePostModal({ isParent, posts, categories, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "",
    category: "",
    incident_time_estimate: "",
    post_message: "",
  })
  const [imageFiles, setImageFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const [links, setLinks] = useState([])
  const [linkSearch, setLinkSearch] = useState("")
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const linkable = useMemo(() => {
    const q = linkSearch.trim().toLowerCase()
    return posts
      .filter((p) => !p.isParentPost)
      .filter((p) => !q || p.title?.toLowerCase().includes(q))
      .slice(0, 50)
  }, [posts, linkSearch])

  const toggleLink = (id) =>
    setLinks((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]))

  const handleFiles = (incomingFiles) => {
    setError("")
    const newFiles = Array.from(incomingFiles)
    if (imageFiles.length + newFiles.length > 5) {
      setError("You can only upload a maximum of 5 images.")
      return
    }

    for (const file of newFiles) {
      if (!file.type.startsWith("image/")) {
        setError(`${file.name} is not a valid image file.`)
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(`${file.name} exceeds the 5 MB limit.`)
        return
      }
    }

    setImageFiles((prev) => [...prev, ...newFiles])
  }

  const removeImage = (indexToRemove) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== indexToRemove))
  }

  const onDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = () => {
    setIsDragging(false)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError("")

    const { title, category, incident_time_estimate, post_message } = form
    if (!title || !category || !incident_time_estimate || !post_message) {
      setError("Fill in every field except images.")
      return
    }

    setSubmitting(true)
    try {
      let imageUrls = []
      if (imageFiles.length > 0) {
        const uploaded = await uploadImages(imageFiles)
        imageUrls = uploaded.map((img) => img.url)
      }

      const payload = {
        title: title.trim(),
        category: category.trim(),
        incident_time_estimate: incident_time_estimate.trim(),
        post_time: new Date().toISOString(),
        post_message: post_message.trim(),
        images: imageUrls,
        isParentPost: isParent,
        parentPostLinks: links,
      }

      const data = await api(isParent ? "/parent-post" : "/post", {
        method: "POST",
        body: JSON.stringify(payload),
      })
      onCreated(data.post)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={isParent ? "Create parent post" : "Create post"} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title">
          <input className={inputCls} value={form.title} onChange={set("title")} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <input
              className={inputCls}
              list="category-options"
              value={form.category}
              onChange={set("category")}
            />
            <datalist id="category-options">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Incident time estimate">
            <input
              className={inputCls}
              placeholder="e.g. Around 6pm yesterday"
              value={form.incident_time_estimate}
              onChange={set("incident_time_estimate")}
            />
          </Field>
        </div>

        <Field label="Message">
          <textarea rows={5} className={inputCls} value={form.post_message} onChange={set("post_message")} />
        </Field>

        {/* Styled Image Dropzone / Gallery Picker */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="block text-sm font-medium text-slate-700">Images</span>
            <span className="text-xs text-slate-500">{imageFiles.length} / 5 selected</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files)
              e.target.value = ""
            }}
          />

          {imageFiles.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInputRef.current?.click()}
              className={`group flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200 ${isDragging
                ? "border-teal-600 bg-teal-50/70 scale-[0.99]"
                : "border-slate-300 bg-slate-50/60 hover:border-teal-600 hover:bg-slate-50"
                }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100/80 text-teal-700 transition-transform group-hover:scale-110">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-800 group-hover:text-teal-700">
                Click to open gallery <span className="font-normal text-slate-500">or drag and drop</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                PNG, JPG, WEBP or GIF (up to 5 images, max 5 MB each)
              </p>
            </div>
          ) : (
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`rounded-xl border-2 border-dashed p-3 transition-colors ${isDragging ? "border-teal-600 bg-teal-50/50" : "border-slate-200 bg-slate-50/40"
                }`}
            >
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {imageFiles.map((file, idx) => {
                  const previewUrl = URL.createObjectURL(file)
                  return (
                    <div
                      key={idx}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm"
                    >
                      <img src={previewUrl} alt={file.name} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeImage(idx)
                        }}
                        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/80 text-xs font-bold text-white shadow hover:bg-rose-600 transition-colors"
                        title="Remove image"
                        aria-label="Remove image"
                      >
                        ✕
                      </button>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/85 via-slate-900/40 to-transparent px-1.5 py-1 text-center">
                        <p className="truncate text-[10px] font-medium text-white">{file.name}</p>
                        <p className="text-[9px] text-slate-300">
                          {(file.size / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      </div>
                    </div>
                  )
                })}

                {imageFiles.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white text-slate-500 hover:border-teal-600 hover:bg-teal-50/30 hover:text-teal-700 transition-colors"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="mt-1 text-[11px] font-medium">Add more</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {isParent && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="block text-sm font-medium text-slate-700">
                Linked posts ({links.length} selected)
              </span>
              <button
                type="button"
                onClick={() => setShowLinkModal(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
                Open full post selector
              </button>
            </div>

            <input
              className={`${inputCls} text-xs`}
              placeholder="Quick search posts by title…"
              value={linkSearch}
              onChange={(e) => setLinkSearch(e.target.value)}
            />

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="mb-2 flex items-center justify-between border-b border-slate-200/70 pb-2">
                <span className="text-[11px] font-medium text-slate-500">
                  Quick list ({linkable.length} matching)
                </span>
                <button
                  type="button"
                  onClick={() => setShowLinkModal(true)}
                  className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-teal-700 border border-slate-200 shadow-xs hover:bg-teal-50 hover:border-teal-300 transition-colors"
                >
                  More posts & keyword filter →
                </button>
              </div>

              <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 rounded-lg bg-white border border-slate-200/70">
                {linkable.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-slate-500">No posts match.</p>
                ) : (
                  linkable.slice(0, 5).map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-xs hover:bg-slate-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={links.includes(p.id)}
                        onChange={() => toggleLink(p.id)}
                        className="accent-teal-700 rounded cursor-pointer"
                      />
                      <span className="flex-1 truncate font-medium text-slate-800">{p.title}</span>
                      <StatusBadge status={p.status} />
                    </label>
                  ))
                )}
              </div>

              {linkable.length > 5 && (
                <div className="mt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setShowLinkModal(true)}
                    className="text-xs font-medium text-teal-700 hover:text-teal-800 hover:underline"
                  >
                    View all {linkable.length} matching posts in modal…
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {submitting ? "Uploading & saving…" : isParent ? "Create parent post" : "Create post"}
          </button>
        </div>
      </form>

      {showLinkModal && (
        <LinkPostsModal
          posts={posts}
          categories={categories}
          selectedLinks={links}
          onToggle={toggleLink}
          onClose={() => setShowLinkModal(false)}
        />
      )}
    </Modal>
  )
}

/* ---------- Post preview + status + delete ---------- */

function PostModal({ post, allPosts, onClose, onStatusChange, onDelete }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const linked = (post.parentPostLinks ?? [])
    .map((id) => allPosts.find((p) => p.id === id))
    .filter(Boolean)

  const changeStatus = async (e) => {
    const next = e.target.value
    if (next === post.status) return
    setBusy(true)
    setError("")
    try {
      await api(`/posts/${post.id}/${STATUS_ROUTE[next]}`, { method: "PUT" })
      onStatusChange(post.id, next)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm("Delete this post? It will be marked as rejected and removed from public view.")) return
    setBusy(true)
    setError("")
    try {
      await api(`/posts/${post.id}`, { method: "DELETE" })
      onDelete(post.id)
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Modal title="Post preview" onClose={onClose} wide>
      <div className="space-y-5">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={post.status} />
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              {post.category}
            </span>
            {post.isParentPost && (
              <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-800">
                Parent post
              </span>
            )}
          </div>
          <h3 className="text-xl font-semibold text-slate-900">{post.title}</h3>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Incident time</dt>
            <dd className="text-slate-900">{post.incident_time_estimate || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Posted</dt>
            <dd className="text-slate-900">{formatDate(post.post_time)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Created</dt>
            <dd className="text-slate-900">{formatDate(post.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Submitted by</dt>
            <dd className="text-slate-900 capitalize">{post.role ?? "—"}</dd>
          </div>
        </dl>

        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{post.post_message}</p>

        {post.images?.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {post.images.map((src, i) => (
              <a key={i} href={src} target="_blank" rel="noreferrer">
                <img
                  src={src}
                  alt={`Attachment ${i + 1}`}
                  className="h-28 w-full rounded-md border border-slate-200 object-cover"
                />
              </a>
            ))}
          </div>
        )}

        {post.isParentPost && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-slate-700">
              Linked posts ({post.parentPostLinks?.length ?? 0})
            </h4>
            {linked.length === 0 ? (
              <p className="text-sm text-slate-500">None of the linked posts are loaded.</p>
            ) : (
              <ul className="space-y-1 text-sm text-slate-800">
                {linked.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded border border-slate-100 px-3 py-1.5">
                    <span className="truncate">{p.title}</span>
                    <StatusBadge status={p.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {post.deletedAt && (
          <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">
            Deleted by {post.deletedBy ?? "unknown"} on {formatDate(post.deletedAt)}
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            Status
            <select
              value={post.status}
              onChange={changeStatus}
              disabled={busy || post.deletedAt}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/30 disabled:opacity-60"
            >
              {Object.entries(STATUS).map(([value, s]) => (
                <option key={value} value={value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={remove}
            disabled={busy}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
          >
            Delete post
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ---------- Pages ---------- */

function HomePage({ counts, onCreate, onCreateParent, onReview }) {
  const cards = [
    { key: "total", label: "All posts", value: counts.total, tone: "text-slate-900" },
    { key: "approved", label: "Approved", value: counts.approved, tone: "text-emerald-700" },
    { key: "pending", label: "Pending", value: counts.pending, tone: "text-amber-700" },
    { key: "rejected", label: "Rejected", value: counts.rejected, tone: "text-rose-700" },
  ]

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.key} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className={`mt-1 text-4xl font-semibold tabular-nums ${c.tone}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={onReview}
          className="rounded-md bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800"
        >
          Start reviewing{counts.pending ? ` (${counts.pending} pending)` : ""}
        </button>
        <button
          onClick={onCreate}
          className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Create post
        </button>
        <button
          onClick={onCreateParent}
          className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Create parent post
        </button>
      </div>
    </div>
  )
}

function PostsPage({ posts, categories, filters, setFilters, onSelect }) {
  const filtered = useMemo(() => {
    const q = filters.keyword.trim().toLowerCase()
    return posts.filter((p) => {
      if (filters.status !== "all" && p.status !== filters.status) return false
      if (filters.category !== "all" && p.category !== filters.category) return false
      if (q) {
        const haystack = `${p.title ?? ""} ${p.post_message ?? ""} ${p.category ?? ""}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [posts, filters])

  const update = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search title, message or category"
          value={filters.keyword}
          onChange={update("keyword")}
          className={`${inputCls} sm:max-w-xs`}
        />
        <select value={filters.status} onChange={update("status")} className={`${inputCls} sm:w-40`} aria-label="Filter by status">
          <option value="all">All statuses</option>
          {Object.entries(STATUS).map(([value, s]) => (
            <option key={value} value={value}>
              {s.label}
            </option>
          ))}
        </select>
        <select value={filters.category} onChange={update("category")} className={`${inputCls} sm:w-48`} aria-label="Filter by category">
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-slate-500">
        Showing {filtered.length} of {posts.length} posts
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Incident time</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  No posts match these filters.
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr
                key={p.id}
                tabIndex={0}
                onClick={() => onSelect(p)}
                onKeyDown={(e) => e.key === "Enter" && onSelect(p)}
                className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
              >
                <td className="max-w-xs truncate px-4 py-3 font-medium text-slate-900">
                  {p.title}
                  {p.isParentPost && (
                    <span className="ml-2 rounded bg-teal-100 px-1.5 py-0.5 text-xs font-medium text-teal-800">
                      Parent
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">{p.category}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 text-slate-700">{p.incident_time_estimate}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDate(p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------- Dashboard ---------- */

export default function Dashboard() {
  const [page, setPage] = useState("home")
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [admin, setAdmin] = useState(
    localStorage.getItem("username") || ""
  )
  const [createMode, setCreateMode] = useState(null) // null | "post" | "parent"
  const [selectedId, setSelectedId] = useState(null)
  const [filters, setFilters] = useState({ status: "all", category: "all", keyword: "" })

  // GET /posts is cursor paginated: { posts, nextCursor, hasMore }. Walk every page.
  const fetchPosts = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      let all = []
      let cursor = null
      let hasMore = true
      while (hasMore) {
        const qs = new URLSearchParams({ limit: "100" })
        if (cursor) qs.set("cursor", cursor)
        const data = await api(`/posts?${qs}`)
        all = all.concat(data.posts)
        cursor = data.nextCursor
        hasMore = data.hasMore && !!cursor
      }
      setPosts(all)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  // POST /verify-token returns the signed-in admin's email.
  useEffect(() => {
    api("/verify-token", { method: "POST" })
      .then((data) => setAdmin((current) => current || data.username || data.uid))
      .catch(() => { })
  }, [])

  const counts = useMemo(
    () => ({
      total: posts.length,
      approved: posts.filter((p) => p.status === "approved").length,
      pending: posts.filter((p) => p.status === "pending").length,
      rejected: posts.filter((p) => p.status === "rejected").length,
    }),
    [posts]
  )

  const categories = useMemo(
    () => [...new Set(posts.map((p) => p.category).filter(Boolean))].sort(),
    [posts]
  )

  const selected = posts.find((p) => p.id === selectedId) ?? null

  const handleCreated = (post) => setPosts((prev) => [post, ...prev])

  const handleStatusChange = (id, status) =>
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)))

  const handleDelete = (id) =>
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: "rejected", deletedAt: new Date().toISOString() } : p
      )
    )

  const startReviewing = () => {
    setFilters({ status: "pending", category: "all", keyword: "" })
    setPage("posts")
  }

  const goTo = (target) => {
    if (target === "posts") setFilters({ status: "all", category: "all", keyword: "" })
    setPage(target)
  }

  const signOut = () => {
    localStorage.removeItem("token")
    window.location.reload()
  }

  const navItem = (key, label, badge) => (
    <button
      onClick={() => goTo(key)}
      aria-current={page === key ? "page" : undefined}
      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${page === key ? "bg-teal-700 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
        }`}
    >
      {label}
      {badge > 0 && (
        <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-semibold text-slate-900">
          {badge}
        </span>
      )}
    </button>
  )

  return (
    <section className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside id="sidebar" className="flex w-56 shrink-0 flex-col bg-slate-900 p-4">
        <h1 className="mb-6 px-3 text-base font-semibold text-white">Incident reports</h1>
        <nav className="space-y-1">
          {navItem("home", "Home")}
          {navItem("posts", "Posts", counts.pending)}
        </nav>
        <button
          onClick={signOut}
          className="mt-auto rounded-md px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          Sign out
        </button>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div id="topbar" className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold">{page === "home" ? "Overview" : "All posts"}</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{admin || "Admin"}</span>
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-700 text-sm font-semibold text-white"
            >
              {(admin || "A").charAt(0).toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex-1 p-6">
          {error && (
            <div role="alert" className="mb-4 flex items-center justify-between rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <span>Could not load posts: {error}</span>
              <button onClick={fetchPosts} className="font-medium underline">
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <p className="text-sm text-slate-500">Loading posts…</p>
          ) : page === "home" ? (
            <HomePage
              counts={counts}
              onCreate={() => setCreateMode("post")}
              onCreateParent={() => setCreateMode("parent")}
              onReview={startReviewing}
            />
          ) : (
            <PostsPage
              posts={posts}
              categories={categories}
              filters={filters}
              setFilters={setFilters}
              onSelect={(p) => setSelectedId(p.id)}
            />
          )}
        </div>
      </main>

      {createMode && (
        <CreatePostModal
          isParent={createMode === "parent"}
          posts={posts}
          categories={categories}
          onClose={() => setCreateMode(null)}
          onCreated={handleCreated}
        />
      )}

      {selected && (
        <PostModal
          post={selected}
          allPosts={posts}
          onClose={() => setSelectedId(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}
    </section>
  )
}
interface MessageProps {
  id: string
  content: string
  member: {
    name: string
    avatarUrl?: string
    color?: string
  }
  timestamp: string
  isHead?: boolean
}

const isImage = (url: string) => {
  try {
    const { pathname } = new URL(url)
    return /\.(gif|jpe?g|tiff?|png|webp|bmp)$/i.test(pathname)
  } catch {
    return false
  }
}

export default function Message({ content, member, timestamp, isHead = true }: MessageProps) {
  const isImg = isImage(content)

  return (
    <div
      className={`group flex items-start gap-3 px-4 py-1 hover:bg-zinc-800/30 w-full ${
        isHead ? 'mt-[17px]' : 'mt-0.5'
      }`}
    >
      {isHead ? (
        <div className="cursor-pointer w-10 h-10 rounded-full bg-indigo-500 flex-shrink-0 flex items-center justify-center text-white overflow-hidden mt-0.5">
          {member.avatarUrl ? (
            <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
          ) : (
            <span className="font-medium text-sm">{member.name.substring(0, 2).toUpperCase()}</span>
          )}
        </div>
      ) : (
        <div className="w-10 flex-shrink-0 text-[10px] text-zinc-500 opacity-0 group-hover:opacity-100 text-right select-none pt-1">
          {new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })}
        </div>
      )}

      <div className="flex flex-col min-w-0 flex-1">
        {isHead && (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white hover:underline cursor-pointer">
              {member.name}
            </span>
            <span className="text-xs text-zinc-500 ml-1">
              {new Date(timestamp).toLocaleDateString()} at{' '}
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* Image vs Text */}
        {isImg ? (
          <div className="mt-2">
            <img
              src={content}
              alt="Attachment"
              className="rounded-md max-w-sm max-h-[300px] object-cover border border-zinc-700"
            />
          </div>
        ) : (
          <p
            className={`text-zinc-300 whitespace-pre-wrap break-words ${
              !isHead ? 'leading-tight' : ''
            }`}
          >
            {content}
          </p>
        )}
      </div>
    </div>
  )
}

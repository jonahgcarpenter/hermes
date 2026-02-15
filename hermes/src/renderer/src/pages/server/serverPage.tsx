import { useParams } from 'react-router-dom'
import Message from '../../componenets/servers/chat/message'
import { SAMPLE_CHATS } from '../../sample-data/chats'

export default function ServerPage() {
  const { channelId } = useParams()

  const channelMessages = SAMPLE_CHATS.filter((m) => m.channelId === channelId)

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-700">
      {/* Chat Header would go here */}

      <div className="flex-1 overflow-y-auto flex flex-col justify-end pb-4">
        {channelMessages.length > 0 ? (
          channelMessages.map((msg, index) => {
            const isHead = index === 0 || channelMessages[index - 1].user !== msg.user

            return (
              <Message
                key={msg.id}
                id={msg.id}
                content={msg.message}
                member={msg.member}
                timestamp={msg.sent_at}
                isHead={isHead}
              />
            )
          })
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            No messages yet. Start the conversation!
          </div>
        )}
      </div>

      {/* Message Input would go here */}
    </div>
  )
}

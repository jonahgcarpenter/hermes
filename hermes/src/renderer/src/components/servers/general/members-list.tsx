import { User, Crown } from 'lucide-react'

interface Member {
  server_id: string
  user_id: string
  role: string
  nickname?: string
  user: {
    id: string
    username: string
    display_name: string
    avatar_url?: string
    status: string
  }
}

interface MembersListProps {
  members: Member[]
}

const getStatusColor = (status?: string) => {
  switch (status?.toLowerCase()) {
    case 'offline':
      return 'bg-zinc-500'
    case 'away':
      return 'bg-yellow-500'
    default:
      return 'bg-emerald-500'
  }
}

export default function MembersList({ members }: MembersListProps) {
  return (
    <div className="hidden md:flex flex-col w-60 bg-zinc-900 flex-shrink-0 h-full overflow-y-auto no-scrollbar p-3">
      <div className="uppercase text-xs font-bold text-zinc-400 mb-2 px-2">
        Members — {members.length}
      </div>

      <div className="space-y-[2px]">
        {members.map((member) => {
          const displayName = member.nickname || member.user.display_name
          const isOwner = member.role === 'owner'

          return (
            <div
              key={member.user_id}
              className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-zinc-800 cursor-pointer group opacity-90 hover:opacity-100 transition-opacity"
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white overflow-hidden">
                  {member.user.avatar_url ? (
                    <img
                      src={member.user.avatar_url}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={16} />
                  )}
                </div>
                {/* Status Dot */}
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-zinc-900 rounded-full flex items-center justify-center">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${getStatusColor(member.user.status)}`}
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-medium ${isOwner ? 'text-yellow-500' : 'text-zinc-300 group-hover:text-zinc-200'}`}
                  >
                    {displayName}
                  </span>
                  {isOwner && (
                    <Crown size={12} className="text-yellow-500 mb-0.5" fill="currentColor" />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

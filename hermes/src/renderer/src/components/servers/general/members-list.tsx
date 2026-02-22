import { User, Crown } from 'lucide-react'

interface Member {
  ID: number
  Name: string
  AvatarURL?: string
  IsOwner?: boolean
  Status?: 'online' | 'idle' | 'dnd' | 'offline'
}

interface MembersListProps {
  members: Member[]
}

export default function MembersList({ members }: MembersListProps) {
  return (
    <div className="hidden md:flex flex-col w-60 bg-zinc-900 flex-shrink-0 h-full overflow-y-auto no-scrollbar p-3">
      <div className="uppercase text-xs font-bold text-zinc-400 mb-2 px-2">
        Members — {members.length}
      </div>

      <div className="space-y-[2px]">
        {members.map((member) => (
          <div
            key={member.ID}
            className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-zinc-800 cursor-pointer group opacity-90 hover:opacity-100 transition-opacity"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white overflow-hidden">
                {member.AvatarURL ? (
                  <img
                    src={member.AvatarURL}
                    alt={member.Name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={16} />
                )}
              </div>
              {/* Status Dot (Mocked) */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-zinc-900 rounded-full flex items-center justify-center">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${member.Status === 'online' ? 'bg-green-500' : 'bg-zinc-500'}`}
                />
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-medium ${member.IsOwner ? 'text-yellow-500' : 'text-zinc-300 group-hover:text-zinc-200'}`}
                >
                  {member.Name}
                </span>
                {member.IsOwner && (
                  <Crown size={12} className="text-yellow-500 mb-0.5" fill="currentColor" />
                )}
              </div>
              {/* Optional Status Text */}
              {/* <span className="text-xs text-zinc-500">Playing a game</span> */}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

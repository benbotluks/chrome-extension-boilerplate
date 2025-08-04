import { ChatMessage } from '../../types';
import { formatTimestamp, formatUrl } from '../../utils/formattingUtils';

interface MessageProps {
    message: ChatMessage
    url: string

}

export const Message: React.FC<MessageProps> = ({ message, url }) => {

    const { id, type, timestamp, content } = message
    return <div
        key={id}
        className={`flex mb-2 ${type === 'user' ? 'justify-end' : 'justify-start'}`}
    >
        <div className="max-w-[80%] min-w-[120px]">
            <div className={`px-4 py-3 rounded-2xl text-sm leading-snug break-words ${type === 'user'
                ? 'bg-bootstrap-primary text-white rounded-br-sm'
                : 'bg-bootstrap-gray-200 text-gray-800 rounded-bl-sm'
                }`}>
                {content}
            </div>

            <div className={`flex items-center gap-2 mt-1 text-xs text-gray-600 px-1 ${type === 'user' ? 'justify-end' : 'justify-start'
                }`}>
                <span>
                    {formatTimestamp(timestamp)}
                </span>

                {url && (
                    <span className="flex items-center gap-1 max-w-[150px]">
                        <span className="text-[10px] opacity-70">🔗</span>
                        <span className="whitespace-nowrap overflow-hidden text-ellipsis opacity-80" title={url}>
                            {formatUrl(url)}
                        </span>
                    </span>
                )}
            </div>
        </div>
    </div>
}
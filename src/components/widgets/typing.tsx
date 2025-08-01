export const TypingWidget: React.FC<{}> = () => {
    return <div className="flex justify-start mb-2">
        <div className="max-w-[80%] min-w-[120px]">
            <div className="px-4 py-3 rounded-2xl text-sm leading-snug break-words bg-bootstrap-gray-200 text-gray-800 rounded-bl-sm">
                <div className="flex items-center gap-1 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: '-0.32s' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-bounce" style={{ animationDelay: '-0.16s' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-bounce"></span>
                </div>
            </div>
        </div>
    </div>
}
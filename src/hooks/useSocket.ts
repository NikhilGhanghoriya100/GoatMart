import {useEffect,useRef,useCallback} from "react";
import {io,Socket} from "socket.io-client";
import {useSession} from "next-auth/react";
let socket:Socket|null=null;
export function useSocket(){
  const{data:session}=useSession();
  const socketRef=useRef<Socket|null>(null);
  useEffect(()=>{
    if(!session?.user?.id)return;
    if(!socket)socket=io(process.env.NEXT_PUBLIC_SOCKET_URL||"http://localhost:3001",{transports:["websocket"],autoConnect:true});
    socketRef.current=socket;
    socket.on("connect",()=>{socket?.emit("user:join",session.user.id);});
    if(socket.connected)socket.emit("user:join",session.user.id);
  },[session?.user?.id]);
  const joinChat=useCallback((chatId:string)=>{socketRef.current?.emit("chat:join",chatId);},[]);
  const leaveChat=useCallback((chatId:string)=>{socketRef.current?.emit("chat:leave",chatId);},[]);
  const sendMessage=useCallback((chatId:string,message:Record<string,unknown>)=>{socketRef.current?.emit("chat:message",{chatId,message});},[]);
  const sendTyping=useCallback((chatId:string,userName:string,isTyping:boolean)=>{socketRef.current?.emit("chat:typing",{chatId,userName,isTyping});},[]);
  const onMessage=useCallback((handler:(data:{chatId:string;message:unknown})=>void)=>{socketRef.current?.on("chat:message",handler);return()=>{socketRef.current?.off("chat:message",handler);};},[]);
  const onTyping=useCallback((handler:(data:unknown)=>void)=>{socketRef.current?.on("chat:typing",handler);return()=>{socketRef.current?.off("chat:typing",handler);};},[]);
  return{joinChat,leaveChat,sendMessage,sendTyping,onMessage,onTyping,socket:socketRef.current};
}

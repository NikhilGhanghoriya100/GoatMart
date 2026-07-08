const{createServer}=require("http");
const{Server}=require("socket.io");
const httpServer=createServer();
const io=new Server(httpServer,{cors:{origin:process.env.NEXT_PUBLIC_APP_URL||"http://localhost:3000",methods:["GET","POST"],credentials:true}});
const onlineUsers=new Map();
io.on("connection",(socket)=>{
  console.log("Client connected:",socket.id);
  socket.on("user:join",(userId)=>{onlineUsers.set(userId,socket.id);socket.userId=userId;io.emit("users:online",Array.from(onlineUsers.keys()));console.log(`User ${userId} online`);});
  socket.on("chat:join",(chatId)=>{socket.join(`chat:${chatId}`);});
  socket.on("chat:leave",(chatId)=>{socket.leave(`chat:${chatId}`);});
  socket.on("chat:message",(data)=>{io.to(`chat:${data.chatId}`).emit("chat:message",{chatId:data.chatId,message:data.message});});
  socket.on("chat:typing",(data)=>{socket.to(`chat:${data.chatId}`).emit("chat:typing",{chatId:data.chatId,userId:socket.userId,userName:data.userName,isTyping:data.isTyping});});
  socket.on("chat:read",(data)=>{socket.to(`chat:${data.chatId}`).emit("chat:read",{chatId:data.chatId,readBy:socket.userId});});
  socket.on("disconnect",()=>{if(socket.userId){onlineUsers.delete(socket.userId);io.emit("users:online",Array.from(onlineUsers.keys()));}});
});
const PORT=process.env.SOCKET_PORT||3001;
httpServer.listen(PORT,()=>console.log(`Socket.IO server on port ${PORT}`));

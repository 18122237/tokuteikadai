import './App.css';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Chat } from './components/pages/Chat';
import { Home } from './components/pages/Home';
import { Search } from './components/pages/Search';
import { Login } from './components/pages/Login';
import { LoginFailed } from './components/pages/LoginFailed';
import { Register } from './components/pages/Register';
import { NotFound } from './components/pages/NotFound';
import { RegisterSucceeded } from './components/pages/RegisterSucceeded';
import { RegisterFailed } from './components/pages/RegisterFailed';
import { UserProvider } from './components/providers/UserProvider';
import { CalendarCreate } from './components/pages/CalendarCreate';
import { CalendarList } from './components/pages/CalendarList';
import { RegisterLecture } from './components/pages/RegisterLecture';
import { ChatProvider } from './components/providers/ChatContext';
import  PublicScheduleList  from './components/pages/PublicScheduleList';
import PublicScheduleDetail from './components/pages/PublicScheduleDetail';
import PublicScheduleSearch from './components/pages/PublicScheduleSearch';


function App() {
  return (
    <UserProvider>
    <ChatProvider>
      <BrowserRouter>
        <Routes>
          {/* 認証関連 */}
          <Route path="/login" element={<Login />} />
          <Route path="/loginfailed" element={<LoginFailed />} />
          <Route path="/register" element={<Register />} />
          <Route path="/registersucceeded" element={<RegisterSucceeded />} />
          <Route path="/registerfailed" element={<RegisterFailed />} />

          {/* メイン機能 */}
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/search" element={<Search />} />
          <Route path="/calendar/create" element={<CalendarCreate />} />
          <Route path="/calendar/list" element={<CalendarList />} />
          <Route path="/register-lecture" element={<RegisterLecture />} />
          <Route path="/public-schedules" element={<PublicScheduleList />} />

          {/* 👇 公開中の時間割 関連ページをここに追加 */}
            <Route path="/public-schedules" element={<PublicScheduleList />} />
            <Route path="/public-schedules/:id" element={<PublicScheduleDetail />} />

          {/* 404 Not Found */}
          <Route path="*" element={<NotFound />} />
          
          <Route path="/public-schedules/search" element={<PublicScheduleSearch />} />
        </Routes>
      </BrowserRouter>
    </ChatProvider>
    </UserProvider>
  );
}

export default App;

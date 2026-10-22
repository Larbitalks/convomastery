import { Route, Routes } from 'react-router-dom'
import { RequireAdmin, RequireAuth } from './components/Guards'
import { DashboardLayout } from './components/DashboardLayout'
import { Layout } from './components/Layout'
import Bookings from './pages/Bookings'
import ClassDetail from './pages/ClassDetail'
import Classes from './pages/Classes'
import Messages from './pages/Messages'
import StudentRecord from './pages/StudentRecord'
import Students from './pages/Students'
import Teach from './pages/Teach'
import AdminBookings from './pages/admin/AdminBookings'
import AdminMessages from './pages/admin/AdminMessages'
import About from './pages/About'
import Account from './pages/Account'
import { ForgotPassword, Login, ResetPassword, Signup } from './pages/Auth'
import CheckoutSuccess from './pages/CheckoutSuccess'
import Contact from './pages/Contact'
import Home from './pages/Home'
import LessonDetail from './pages/LessonDetail'
import Lessons from './pages/Lessons'
import Library from './pages/Library'
import NotFound from './pages/NotFound'
import Pricing from './pages/Pricing'
import { ProgressEntry, ProgressView } from './pages/Progress'
import AdminLayout from './pages/admin/AdminLayout'
import AdminCategories from './pages/admin/AdminCategories'
import AdminInquiries from './pages/admin/AdminInquiries'
import AdminLessonEdit from './pages/admin/AdminLessonEdit'
import AdminLessons from './pages/admin/AdminLessons'
import AdminOrders from './pages/admin/AdminOrders'

export default function App() {
  return (
    <Routes>
      <Route path="teach/:slug" element={<RequireAuth><Teach /></RequireAuth>} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="lessons" element={<Lessons />} />
        <Route path="lessons/:slug" element={<LessonDetail />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="progress" element={<ProgressEntry />} />
        <Route path="progress/:code" element={<ProgressView />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route element={<RequireAuth><DashboardLayout /></RequireAuth>}>
          <Route path="library" element={<Library />} />
          <Route path="classes" element={<Classes />} />
          <Route path="classes/:id" element={<ClassDetail />} />
          <Route path="students" element={<Students />} />
          <Route path="students/:id" element={<StudentRecord />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="messages" element={<Messages />} />
          <Route path="account" element={<Account />} />
        </Route>
        <Route path="checkout/success" element={<RequireAuth><CheckoutSuccess /></RequireAuth>} />
        <Route path="admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<AdminLessons />} />
          <Route path="lessons/new" element={<AdminLessonEdit />} />
          <Route path="lessons/:id" element={<AdminLessonEdit />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="inquiries" element={<AdminInquiries />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="messages" element={<AdminMessages />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Plus, Edit, Trash2 } from "lucide-react"
import { useLanguage } from "@/context/language-context"
import { ManageHeader } from "@/components/manage/manage-header"
import { ManageSidebar } from "@/components/manage/manage-sidebar"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import { getUsers, createUser, updateUser, deleteUser } from "./actions"
import { TriangleLoader } from "@/components/ui/triangle-loader";

interface User {
  id: string
  email: string
  role: string
  full_name: string | null
  restaurant_id: string | null
  created_at: string
}

interface UserFormData {
  email: string
  password: string
  confirmPassword: string
  role: string
}

export default function UsersPage() {
  const { getTranslation } = useLanguage()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState({ email: "", name: "Admin User" })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<UserFormData>({
    email: "",
    password: "",
    confirmPassword: "",
    role: "staff"
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        setUser({
          email: data.session.user.email || "",
          name: data.session.user.user_metadata?.full_name || "Admin User",
        })
      }
      fetchUsers()
    }

    checkSession()
  }, [])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const result = await getUsers()
      if (result.success && result.data) {
        setUsers(result.data)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to fetch users",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.email) {
      errors.email = getTranslation("manage.users.form.emailRequired")
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = getTranslation("manage.users.form.invalidEmail")
    }

    if (!editingUser && !formData.password) {
      errors.password = getTranslation("manage.users.form.passwordRequired")
    }

    if (!editingUser && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = getTranslation("manage.users.form.passwordMismatch")
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      if (editingUser) {
        // Update user
        const result = await updateUser(editingUser.id, {
          email: formData.email,
          role: formData.role
        })
        
        if (result.success) {
          await fetchUsers() // Refresh the list
          toast({
            title: "Success",
            description: getTranslation("manage.users.userUpdated")
          })
          handleCloseDialog()
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to update user",
            variant: "destructive"
          })
        }
      } else {
        // Add new user
        const result = await createUser({
          email: formData.email,
          password: formData.password,
          role: formData.role
        })
        
        if (result.success) {
          await fetchUsers() // Refresh the list
          toast({
            title: "Success",
            description: getTranslation("manage.users.userAdded")
          })
          handleCloseDialog()
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to create user",
            variant: "destructive"
          })
        }
      }
    } catch (error) {
      console.error("Error saving user:", error)
      toast({
        title: "Error",
        description: "Failed to save user",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (deleteConfirmText !== "delete") {
      toast({
        title: "Error",
        description: "Please type 'delete' to confirm",
        variant: "destructive"
      })
      return
    }

    try {
      const result = await deleteUser(userId)
      if (result.success) {
        await fetchUsers() // Refresh the list
        toast({
          title: "Success",
          description: getTranslation("manage.users.userDeleted")
        })
        setDeleteConfirmText("")
        setDeletingUserId(null)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete user",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      })
    }
  }

  const handleOpenDeleteDialog = (userId: string) => {
    setDeletingUserId(userId)
    setDeleteConfirmText("")
  }

  const handleCloseDeleteDialog = () => {
    setDeletingUserId(null)
    setDeleteConfirmText("")
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      password: "",
      confirmPassword: "",
      role: user.role
    })
    setFormErrors({})
    setIsDialogOpen(true)
  }

  const handleAddUser = () => {
    setEditingUser(null)
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      role: "staff"
    })
    setFormErrors({})
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingUser(null)
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      role: "staff"
    })
    setFormErrors({})
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-100 flex items-center justify-center z-50">
        <div className="text-center">
          <TriangleLoader />
          <p className="mt-4 text-lg font-semibold text-gray-600">{getTranslation('manage.users.loadingUsers')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <ManageSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ManageHeader user={user} toggleSidebar={toggleSidebar} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold">{getTranslation("manage.users.title")}</h1>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleAddUser}>
                    <Plus className="h-4 w-4 mr-2" />
                    {getTranslation("manage.users.addUser")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingUser ? getTranslation("manage.users.editUser") : getTranslation("manage.users.addUser")}
                    </DialogTitle>
                    <DialogDescription>
                      {editingUser ? "Update user information" : "Add a new admin user to the system"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">{getTranslation("manage.users.form.email")}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={formErrors.email ? "border-red-500" : ""}
                      />
                      {formErrors.email && <p className="text-sm text-red-500">{formErrors.email}</p>}
                    </div>
                    {!editingUser && (
                      <>
                        <div className="grid gap-2">
                          <Label htmlFor="password">{getTranslation("manage.users.form.password")}</Label>
                          <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className={formErrors.password ? "border-red-500" : ""}
                          />
                          {formErrors.password && <p className="text-sm text-red-500">{formErrors.password}</p>}
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="confirmPassword">{getTranslation("manage.users.form.confirmPassword")}</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className={formErrors.confirmPassword ? "border-red-500" : ""}
                          />
                          {formErrors.confirmPassword && <p className="text-sm text-red-500">{formErrors.confirmPassword}</p>}
                        </div>
                      </>
                    )}
                    <div className="grid gap-2">
                      <Label htmlFor="role">{getTranslation("manage.users.form.role")}</Label>
                      <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">{getTranslation("manage.users.form.admin")}</SelectItem>
                          <SelectItem value="manager">{getTranslation("manage.users.form.manager")}</SelectItem>
                          <SelectItem value="staff">{getTranslation("manage.users.form.staff")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={handleCloseDialog}>
                      {getTranslation("manage.users.form.cancel")}
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                      {isSubmitting ? "Saving..." : getTranslation("manage.users.form.save")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{getTranslation("manage.users.title")}</CardTitle>
                <CardDescription>
                  Manage admin users who can access the reservation management system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">{getTranslation("manage.users.table.noUsers")}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{getTranslation("manage.users.table.email")}</TableHead>
                        <TableHead>{getTranslation("manage.users.table.role")}</TableHead>
                        <TableHead>{getTranslation("manage.users.table.createdAt")}</TableHead>
                        <TableHead className="text-right">{getTranslation("manage.users.table.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.email}</TableCell>
                          <TableCell>
                            <span className="capitalize">
                              {getTranslation(`manage.users.form.${user.role}`)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                {getTranslation("manage.users.table.edit")}
                              </Button>
                              <AlertDialog open={deletingUserId === user.id} onOpenChange={(open) => !open && handleCloseDeleteDialog()}>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" onClick={() => handleOpenDeleteDialog(user.id)}>
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    {getTranslation("manage.users.table.delete")}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{getTranslation("manage.users.deleteUser")}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {getTranslation("manage.users.confirmDelete")}
                                      <br /><br />
                                      <strong>Type "delete" to confirm:</strong>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <div className="py-4">
                                    <Input
                                      value={deleteConfirmText}
                                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                                      placeholder="Type 'delete' to confirm"
                                      className="w-full"
                                    />
                                  </div>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel onClick={handleCloseDeleteDialog}>{getTranslation("manage.users.form.cancel")}</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDeleteUser(user.id)}
                                      disabled={deleteConfirmText !== "delete"}
                                      className={deleteConfirmText !== "delete" ? "opacity-50 cursor-not-allowed" : ""}
                                    >
                                      {getTranslation("manage.users.table.delete")}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
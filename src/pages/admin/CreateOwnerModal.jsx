import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus, Shield, Mail, Lock, Building } from "lucide-react";
import { callAdminApi } from '@/lib/adminApi';
import { useToast } from "@/components/ui/use-toast";

const CreateOwnerModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    businessName: '',
    role: 'owner' // Default to owner
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.email || !formData.password || !formData.businessName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Call the admin API to create the user on the server side
      await callAdminApi('create', {
        email: formData.email,
        password: formData.password,
        business_name: formData.businessName,
        role: formData.role
      });

      toast({
        title: "Success",
        description: `Owner account for ${formData.businessName} created successfully.`,
      });

      // Reset form
      setFormData({
        email: '',
        password: '',
        businessName: '',
        role: 'owner'
      });

      if (onSuccess) onSuccess();
      onClose();

    } catch (error) {
      console.error("Creation error:", error);
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create owner account.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-[#1e293b] border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
            <UserPlus className="w-5 h-5 text-indigo-400" />
            Create New Owner
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Add a new business owner to the platform. They will receive full access permissions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          
          <div className="space-y-2">
            <Label htmlFor="businessName" className="text-slate-300">Business Name</Label>
            <div className="relative">
              <Building className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                id="businessName"
                name="businessName"
                placeholder="e.g. Acme Corp"
                value={formData.businessName}
                onChange={handleChange}
                className="pl-9 bg-[#0f172a] border-slate-600 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="owner@example.com"
                value={formData.email}
                onChange={handleChange}
                className="pl-9 bg-[#0f172a] border-slate-600 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-300">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                id="password"
                name="password"
                type="text" // Visible for admin convenience, could be 'password'
                placeholder="Secure Password"
                value={formData.password}
                onChange={handleChange}
                className="pl-9 bg-[#0f172a] border-slate-600 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500"
              />
            </div>
            <p className="text-[10px] text-slate-500">Password must be at least 6 characters.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Permissions / Role</Label>
            <div className="flex items-center space-x-2 bg-[#0f172a] p-3 rounded-md border border-slate-600">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">Full Access (Owner)</span>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white hover:bg-slate-800">
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" /> Create Account
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOwnerModal;
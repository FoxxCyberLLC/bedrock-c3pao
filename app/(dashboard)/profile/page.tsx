'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Building2,
  Globe,
  Award,
  Save,
  Loader2,
  Star,
  Camera,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { getC3PAOProfile, updateC3PAOProfile, updateC3PAOLogo } from '@/app/actions/c3pao-dashboard'

interface C3PAOProfile {
  id: string
  name: string
  email: string
  phone: string | null
  website: string | null
  description: string | null
  logo: string | null
  address1: string | null
  address2: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  country: string | null
  cageCode: string | null
  cyberAbAccreditationId: string | null
  authorizedLevels: string | null
  pricingInfo: string | null
  typicalTimeline: string | null
  specialties: string | null
  servicesOffered: string | null
  averageRating: number | null
  totalReviews: number
  status: string
  isListed: boolean
  teamStats?: {
    total: number
    active: number
    cca: number
    ccp: number
  }
  engagementStats?: {
    total: number
    active: number
    completed: number
    completedThisYear: number
  }
}

const SPECIALTIES = [
  'Manufacturing',
  'Healthcare',
  'Financial Services',
  'Government Contractors',
  'Technology',
  'Aerospace & Defense',
  'Small Business',
  'Cloud Environments',
]

export default function C3PAOProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<C3PAOProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Form state
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [phone, setPhone] = useState('')
  const [address1, setAddress1] = useState('')
  const [address2, setAddress2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [pricingInfo, setPricingInfo] = useState('')
  const [typicalTimeline, setTypicalTimeline] = useState('')
  const [servicesOffered, setServicesOffered] = useState('')
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [authorizedLevels, setAuthorizedLevels] = useState<string[]>([])

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    setLoading(true)
    try {
      const result = await getC3PAOProfile()
      if (result.success && result.data) {
        const data = result.data as C3PAOProfile
        setProfile(data)
        // Populate form
        setDescription(data.description || '')
        setWebsite(data.website || '')
        setPhone(data.phone || '')
        setAddress1(data.address1 || '')
        setAddress2(data.address2 || '')
        setCity(data.city || '')
        setState(data.state || '')
        setZipCode(data.zipCode || '')
        setPricingInfo(data.pricingInfo || '')
        setTypicalTimeline(data.typicalTimeline || '')
        setServicesOffered(data.servicesOffered || '')
        setSelectedSpecialties(data.specialties ? JSON.parse(data.specialties) : [])
        setAuthorizedLevels(data.authorizedLevels ? JSON.parse(data.authorizedLevels) : [])
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('description', description)
      formData.append('website', website)
      formData.append('phone', phone)
      formData.append('address1', address1)
      formData.append('address2', address2)
      formData.append('city', city)
      formData.append('state', state)
      formData.append('zipCode', zipCode)
      formData.append('pricingInfo', pricingInfo)
      formData.append('typicalTimeline', typicalTimeline)
      formData.append('servicesOffered', servicesOffered)
      selectedSpecialties.forEach(s => formData.append('specialties', s))
      authorizedLevels.forEach(l => formData.append('authorizedLevels', l))

      const result = await updateC3PAOProfile(formData)
      if (result.success) {
        toast.success('Profile updated successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB')
      return
    }

    setUploadingLogo(true)
    try {
      // Convert to base64 for simple storage (in production, upload to S3)
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result as string
        const result = await updateC3PAOLogo(base64)
        if (result.success) {
          toast.success('Logo updated successfully')
          loadProfile()
        } else {
          toast.error(result.error || 'Failed to update logo')
        }
        setUploadingLogo(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading logo:', error)
      toast.error('Failed to upload logo')
      setUploadingLogo(false)
    }
  }

  const toggleSpecialty = (specialty: string) => {
    setSelectedSpecialties(prev =>
      prev.includes(specialty)
        ? prev.filter(s => s !== specialty)
        : [...prev, specialty]
    )
  }

  const toggleLevel = (level: string) => {
    setAuthorizedLevels(prev =>
      prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level]
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">Profile Not Found</h3>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Profile</h1>
          <p className="text-muted-foreground">
            Manage your marketplace presence and organization details
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <span className="text-2xl font-bold">
                {profile.averageRating?.toFixed(1) || 'N/A'}
              </span>
              <span className="text-muted-foreground text-sm">
                ({profile.totalReviews} reviews)
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Engagements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.engagementStats?.total ?? 0}</div>
            {profile.engagementStats && profile.engagementStats.active > 0 && (
              <p className="text-xs text-muted-foreground">{profile.engagementStats.active} active</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={profile.status === 'ACTIVE' ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'}>
              {profile.status}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Marketplace</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={profile.isListed ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-gray-500/10 text-gray-700 dark:text-gray-400'}>
              {profile.isListed ? 'Listed' : 'Unlisted'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">
            <Building2 className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="marketplace">
            <Globe className="h-4 w-4 mr-2" />
            Marketplace
          </TabsTrigger>
          <TabsTrigger value="credentials">
            <Award className="h-4 w-4 mr-2" />
            Credentials
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>
                Basic information about your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="h-24 w-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-muted-foreground/30">
                    {profile.logo ? (
                      <Image src={profile.logo} alt="Logo" width={96} height={96} className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <h3 className="font-semibold">{profile.name}</h3>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click the camera icon to upload a logo (max 2MB)
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://www.example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                  placeholder="Street Address"
                  className="mb-2"
                />
                <Input
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                  placeholder="Suite, Unit, etc. (optional)"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="ZIP"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Marketplace Tab */}
        <TabsContent value="marketplace">
          <Card>
            <CardHeader>
              <CardTitle>Marketplace Profile</CardTitle>
              <CardDescription>
                How your organization appears to potential customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell potential customers about your organization, experience, and approach..."
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  This appears on your marketplace listing
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="servicesOffered">Services Offered</Label>
                <Textarea
                  id="servicesOffered"
                  value={servicesOffered}
                  onChange={(e) => setServicesOffered(e.target.value)}
                  placeholder="List the services you offer (e.g., Gap Analysis, Full Assessment, Remediation Support)..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pricingInfo">Pricing Information</Label>
                  <Input
                    id="pricingInfo"
                    value={pricingInfo}
                    onChange={(e) => setPricingInfo(e.target.value)}
                    placeholder="e.g., Starting at $15,000"
                  />
                  <p className="text-xs text-muted-foreground">
                    General pricing guidance for customers
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="typicalTimeline">Typical Timeline</Label>
                  <Input
                    id="typicalTimeline"
                    value={typicalTimeline}
                    onChange={(e) => setTypicalTimeline(e.target.value)}
                    placeholder="e.g., 4-6 weeks"
                  />
                  <p className="text-xs text-muted-foreground">
                    Average time to complete an assessment
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Specialties</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Select the industries and areas you specialize in
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {SPECIALTIES.map((specialty) => (
                    <div
                      key={specialty}
                      onClick={() => toggleSpecialty(specialty)}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedSpecialties.includes(specialty)
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Checkbox checked={selectedSpecialties.includes(specialty)} />
                      <span className="text-sm">{specialty}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credentials Tab */}
        <TabsContent value="credentials">
          <Card>
            <CardHeader>
              <CardTitle>Credentials & Certifications</CardTitle>
              <CardDescription>
                Your official accreditation information (managed by admin)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-5 w-5 text-primary" />
                    <span className="font-medium">Cyber-AB Accreditation</span>
                  </div>
                  <p className="text-lg font-mono">
                    {profile.cyberAbAccreditationId || 'Not Set'}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <span className="font-medium">CAGE Code</span>
                  </div>
                  <p className="text-lg font-mono">
                    {profile.cageCode || 'Not Set'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Authorized CMMC Levels</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Select the CMMC levels you are authorized to assess
                </p>
                <div className="flex gap-4">
                  {['LEVEL_1', 'LEVEL_2'].map((level) => (
                    <div
                      key={level}
                      onClick={() => toggleLevel(level)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                        authorizedLevels.includes(level)
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Checkbox checked={authorizedLevels.includes(level)} />
                      <span className="font-medium">{level.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm text-yellow-700">
                  <strong>Note:</strong> Accreditation details and CAGE code are verified and managed by the platform administrator. Contact support if you need to update these credentials.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

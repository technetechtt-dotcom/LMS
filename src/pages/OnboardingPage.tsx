import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Upload,
  User,
  BookOpen,
  FileText } from
'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { FileUpload } from '../components/ui/FileUpload';
import { Checkbox } from '../components/ui/Checkbox';
import { toast } from 'sonner';
export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    idNumber: '',
    email: '',
    phone: '',
    address: '',
    programme: '',
    cohort: '',
    workplace: '',
    mentor: '',
    popiaConsent: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const validateStep = (currentStep: number) => {
    const newErrors: Record<string, string> = {};
    if (currentStep === 1) {
      if (!formData.firstName) newErrors.firstName = 'First name is required';
      if (!formData.lastName) newErrors.lastName = 'Last name is required';
      if (!formData.idNumber || formData.idNumber.length !== 13)
      newErrors.idNumber = 'Valid 13-digit ID required';
      if (!formData.email || !formData.email.includes('@'))
      newErrors.email = 'Valid email required';
      if (!formData.phone) newErrors.phone = 'Phone number required';
    }
    if (currentStep === 2) {
      if (!formData.programme) newErrors.programme = 'Please select a programme';
      if (!formData.cohort) newErrors.cohort = 'Please select a cohort';
    }
    if (currentStep === 4) {
      if (!formData.popiaConsent)
      newErrors.popiaConsent = 'You must accept the POPIA terms';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => prev + 1);
    }
  };
  const handleBack = () => {
    setStep((prev) => prev - 1);
  };
  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Registration submitted successfully!');
      navigate('/login');
    }, 1500);
  };
  const steps = [
  {
    id: 1,
    title: 'Personal Info',
    icon: User
  },
  {
    id: 2,
    title: 'Programme',
    icon: BookOpen
  },
  {
    id: 3,
    title: 'Documents',
    icon: Upload
  },
  {
    id: 4,
    title: 'Confirmation',
    icon: FileText
  }];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Learner Registration
          </h1>
          <p className="mt-2 text-gray-600">
            Complete your profile to access the Smart LMS.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10" />
            {steps.map((s) =>
            <div
              key={s.id}
              className="flex flex-col items-center bg-gray-50 px-2">
              
                <div
                className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
                    ${step >= s.id ? 'bg-brand-navy border-brand-navy text-white' : 'bg-white border-gray-300 text-gray-400'}
                  `}>
                
                  {step > s.id ?
                <Check className="h-6 w-6" /> :

                <s.icon className="h-5 w-5" />
                }
                </div>
                <span
                className={`mt-2 text-xs font-medium ${step >= s.id ? 'text-brand-navy' : 'text-gray-500'}`}>
                
                  {s.title}
                </span>
              </div>
            )}
          </div>
        </div>

        <Card className="p-8">
          {step === 1 &&
          <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Personal Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                label="First Name"
                value={formData.firstName}
                onChange={(e) =>
                setFormData({
                  ...formData,
                  firstName: e.target.value
                })
                }
                error={errors.firstName}
                required />
              
                <Input
                label="Last Name"
                value={formData.lastName}
                onChange={(e) =>
                setFormData({
                  ...formData,
                  lastName: e.target.value
                })
                }
                error={errors.lastName}
                required />
              
                <Input
                label="ID Number"
                value={formData.idNumber}
                onChange={(e) =>
                setFormData({
                  ...formData,
                  idNumber: e.target.value
                })
                }
                error={errors.idNumber}
                placeholder="13-digit SA ID"
                maxLength={13}
                required />
              
                <Input
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) =>
                setFormData({
                  ...formData,
                  email: e.target.value
                })
                }
                error={errors.email}
                required />
              
                <Input
                label="Phone Number"
                value={formData.phone}
                onChange={(e) =>
                setFormData({
                  ...formData,
                  phone: e.target.value
                })
                }
                error={errors.phone}
                placeholder="+27..."
                required />
              
                <Input
                label="Residential Address"
                value={formData.address}
                onChange={(e) =>
                setFormData({
                  ...formData,
                  address: e.target.value
                })
                }
                required />
              
              </div>
            </div>
          }

          {step === 2 &&
          <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Programme Selection
              </h2>
              <div className="space-y-4">
                <Select
                label="Select Programme"
                value={formData.programme}
                onChange={(e) =>
                setFormData({
                  ...formData,
                  programme: e.target.value
                })
                }
                error={errors.programme}
                options={[
                {
                  value: 'sysdev',
                  label: 'NC: Systems Development (NQF 5)'
                },
                {
                  value: 'pm',
                  label: 'FETC: Project Management (NQF 4)'
                },
                {
                  value: 'cyber',
                  label: 'OC: Cyber Security (NQF 6)'
                }]
                } />
              
                <Select
                label="Select Cohort"
                value={formData.cohort}
                onChange={(e) =>
                setFormData({
                  ...formData,
                  cohort: e.target.value
                })
                }
                error={errors.cohort}
                options={[
                {
                  value: '2023a',
                  label: '2023-A (Started Jan)'
                },
                {
                  value: '2023b',
                  label: '2023-B (Starts Jun)'
                }]
                } />
              
                <div className="pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">
                    Workplace Details (If applicable)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                    label="Company Name"
                    value={formData.workplace}
                    onChange={(e) =>
                    setFormData({
                      ...formData,
                      workplace: e.target.value
                    })
                    } />
                  
                    <Input
                    label="Mentor Name"
                    value={formData.mentor}
                    onChange={(e) =>
                    setFormData({
                      ...formData,
                      mentor: e.target.value
                    })
                    } />
                  
                  </div>
                </div>
              </div>
            </div>
          }

          {step === 3 &&
          <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Document Upload
              </h2>
              <p className="text-sm text-gray-500">
                Please upload certified copies of the following documents.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Certified ID Copy
                  </label>
                  <FileUpload onUpload={() => undefined} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Highest Qualification (Matric/Degree)
                  </label>
                  <FileUpload onUpload={() => undefined} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proof of Address
                  </label>
                  <FileUpload onUpload={() => undefined} />
                </div>
              </div>
            </div>
          }

          {step === 4 &&
          <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Review & Confirm
              </h2>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Name:</span>
                  <span className="font-medium">
                    {formData.firstName} {formData.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ID Number:</span>
                  <span className="font-medium">{formData.idNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email:</span>
                  <span className="font-medium">{formData.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Programme:</span>
                  <span className="font-medium">
                    {formData.programme === 'sysdev' ?
                  'NC: Systems Development' :
                  formData.programme}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-start">
                  <Checkbox
                  id="popia"
                  checked={formData.popiaConsent}
                  onChange={(e) =>
                  setFormData({
                    ...formData,
                    popiaConsent: e.target.checked
                  })
                  } />
                
                  <label htmlFor="popia" className="ml-3 text-sm text-gray-600">
                    I consent to the processing of my personal information in
                    accordance with the Protection of Personal Information Act
                    (POPIA) for the purpose of my registration and learning
                    administration.
                  </label>
                </div>
                {errors.popiaConsent &&
              <p className="mt-1 text-sm text-red-600 ml-7">
                    {errors.popiaConsent}
                  </p>
              }
              </div>
            </div>
          }

          <div className="mt-8 flex justify-between">
            {
            step > 1 ?
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isLoading}>
              
                  <ChevronLeft className="h-4 w-4 mr-2" /> Back
                </Button> :

            <div />
            // Spacer
            }

            {step < 4 ?
            <Button onClick={handleNext}>
                Next <ChevronRight className="h-4 w-4 ml-2" />
              </Button> :

            <Button onClick={handleSubmit} isLoading={isLoading}>
                Submit Registration
              </Button>
            }
          </div>
        </Card>
      </div>
    </div>);

}
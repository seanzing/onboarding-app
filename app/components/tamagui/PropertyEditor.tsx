// @ts-nocheck
'use client';

/**
 * Property Editor Component - Tamagui Version
 *
 * Allows editing of HubSpot custom properties related to GBP and directory sync
 *
 * Features:
 * - Organized sections (Business, Location, Social, Directory)
 * - Real-time validation
 * - Unsaved changes detection
 * - Directory mapping indicators
 * - Professional UX with clear feedback
 * - Full responsive design with Tamagui breakpoints
 */

import React, { useState, useEffect } from 'react';
import {
  YStack,
  XStack,
  Text,
  Input,
  TextArea,
  Select,
  Button,
  Label,
  Adapt,
  Sheet,
  Separator,
  Dialog,
} from 'tamagui';
import {
  Building2,
  MapPin,
  Share2,
  Settings,
  Save,
  X,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from './Badge';
import { Alert } from './Alert';
import { invalidateContact } from '@/lib/cache/invalidate';

// ============================================================================
// TYPES
// ============================================================================

export interface EditableCompanyProperties {
  // Business Information
  business_category_type?: string;
  business_email_address?: string;
  phone?: string;
  website?: string;
  current_website?: string;

  // Location
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;

  // Social Media
  twitterhandle?: string;
  facebook_company_page?: string;
  linkedin_company_page?: string;

  // Directory Settings
  active_customer?: string;
  business_hours?: string;
  payment_methods_accepted?: string;
}

interface PropertyEditorProps {
  companyId: string;
  companyName: string;
  initialProperties: EditableCompanyProperties;
  onSave?: (properties: EditableCompanyProperties) => void;
  onCancel?: () => void;
}

interface ValidationError {
  field: string;
  message: string;
}

// ============================================================================
// CARD COMPONENTS
// ============================================================================

interface CardProps {
  children: React.ReactNode;
}

function Card({ children }: CardProps) {
  return (
    <YStack
      backgroundColor="$background"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius="$4"
      padding="$5"
      $sm={{ padding: "$6" }}
      $lg={{ padding: "$7" }}
      shadowColor="$shadowColor"
      shadowOffset={{ width: 0, height: 2 }}
      shadowOpacity={0.1}
      shadowRadius={4}
      space="$4"
    >
      {children}
    </YStack>
  );
}

interface CardHeaderProps {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
}

function CardHeader({ icon: Icon, title, description }: CardHeaderProps) {
  return (
    <YStack space="$2">
      <XStack space="$2" alignItems="center">
        <Icon size={20} color="$zingBlue" strokeWidth={2} />
        <Text
          fontSize={18}
          $sm={{ fontSize: 19 }}
          $lg={{ fontSize: 20 }}
          fontWeight="600"
          color="$color"
        >
          {title}
        </Text>
      </XStack>
      <Text
        fontSize={13}
        $sm={{ fontSize: 14 }}
        $lg={{ fontSize: 15 }}
        color="$color"
        opacity={0.7}
      >
        {description}
      </Text>
    </YStack>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PropertyEditor({
  companyId,
  companyName,
  initialProperties,
  onSave,
  onCancel
}: PropertyEditorProps) {
  // State
  const [properties, setProperties] = useState<EditableCompanyProperties>(initialProperties);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Track changes
  useEffect(() => {
    const hasChanges = JSON.stringify(properties) !== JSON.stringify(initialProperties);
    setIsDirty(hasChanges);
  }, [properties, initialProperties]);

  // Handlers
  const handleChange = (field: keyof EditableCompanyProperties, value: string) => {
    setProperties(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    setValidationErrors(prev => prev.filter(err => err.field !== field));
  };

  const handleReset = () => {
    setProperties(initialProperties);
    setValidationErrors([]);
    setSaveStatus('idle');
  };

  const validate = (): boolean => {
    const errors: ValidationError[] = [];

    // Phone validation (if provided)
    if (properties.phone && !/^[\d\s\-\(\)]+$/.test(properties.phone)) {
      errors.push({ field: 'phone', message: 'Invalid phone number format' });
    }

    // Email validation (if provided)
    if (properties.business_email_address &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(properties.business_email_address)) {
      errors.push({ field: 'business_email_address', message: 'Invalid email address' });
    }

    // URL validation (if provided)
    const urlFields: (keyof EditableCompanyProperties)[] = [
      'website',
      'current_website',
      'facebook_company_page',
      'linkedin_company_page'
    ];

    urlFields.forEach(field => {
      const value = properties[field];
      if (value && value.trim() && !value.startsWith('http')) {
        errors.push({
          field,
          message: 'URL must start with http:// or https://'
        });
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Show confirmation modal before saving
  const handleSave = () => {
    // Validate first
    if (!validate()) {
      setSaveStatus('error');
      setSaveMessage('Please fix validation errors before saving');
      return;
    }

    // Show confirmation modal
    setShowConfirmModal(true);
  };

  // Actually execute the save after confirmation
  const confirmAndSave = async () => {
    setShowConfirmModal(false);
    setIsSaving(true);
    setSaveStatus('idle');
    setSaveMessage('');

    try {
      // Filter out empty strings and undefined values
      const cleanedProperties: Record<string, string> = {};
      Object.entries(properties).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value.trim() !== '') {
          cleanedProperties[key] = value.trim();
        }
      });

      // Call API
      const response = await fetch(`/api/hubspot/contacts/${companyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ properties: cleanedProperties })
      });

      const result = await response.json();

      if (result.success) {
        setSaveStatus('success');
        setSaveMessage(`Successfully updated ${result.updatedProperties?.length || 0} properties in HubSpot`);
        setIsDirty(false);

        // CRITICAL: Invalidate SWR cache so UI shows updated data immediately
        // Without this, users would see stale data for up to 5 minutes
        invalidateContact(companyId);
        console.log('[PropertyEditor] Cache invalidated for contact:', companyId);

        // Call onSave callback if provided
        if (onSave) {
          onSave(properties);
        }

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSaveStatus('idle');
          setSaveMessage('');
        }, 3000);
      } else {
        throw new Error(result.error || 'Failed to save properties');
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
      setSaveMessage(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const getFieldError = (field: string): string | undefined => {
    return validationErrors.find(err => err.field === field)?.message;
  };

  return (
    <YStack space="$5" $sm={{ space: "$6" }}>
      {/* Header */}
      <YStack space="$2">
        <Text
          fontSize={24}
          $sm={{ fontSize: 26 }}
          $lg={{ fontSize: 28 }}
          fontWeight="700"
          color="$color"
        >
          Edit Business Profile
        </Text>
        <Text
          fontSize={14}
          $sm={{ fontSize: 15 }}
          $lg={{ fontSize: 16 }}
          color="$color"
          opacity={0.7}
        >
          Editing properties for <Text fontWeight="600">{companyName}</Text>
        </Text>
      </YStack>

      {/* Save Status */}
      {saveStatus !== 'idle' && saveMessage && (
        <Alert variant={saveStatus === 'success' ? 'success' : 'error'}>
          {saveMessage}
        </Alert>
      )}

      {/* Business Information Section */}
      <Card>
        <CardHeader
          icon={Building2}
          title="Business Information"
          description="Core business details visible in directories"
        />
        <Separator borderColor="$borderColor" />
        <YStack space="$4" $sm={{ space: "$4.5" }}>
          {/* Business Category */}
          <YStack space="$2">
            <XStack justifyContent="space-between" alignItems="center">
              <Label
                htmlFor="business_category_type"
                fontSize={14}
                $sm={{ fontSize: 15 }}
                fontWeight="500"
              >
                Business Category
              </Label>
              <Badge variant="outline">
                <XStack space="$1" alignItems="center">
                  <Info size={12} />
                  <Text fontSize={11} $sm={{ fontSize: 12 }}>Directory Required</Text>
                </XStack>
              </Badge>
            </XStack>
            <Input
              id="business_category_type"
              value={properties.business_category_type || ''}
              onChangeText={(text) => handleChange('business_category_type', text)}
              placeholder="e.g., Restaurant, Law Firm, Dentist"
              fontSize={14}
              $sm={{ fontSize: 15 }}
              $lg={{ fontSize: 16 }}
              size="$4"
              $sm={{ size: "$4.5" }}
            />
            <Text fontSize={12} $sm={{ fontSize: 13 }} color="$color" opacity={0.6}>
              Used for directory submission category mapping (86% of records are blank)
            </Text>
          </YStack>

          {/* Business Email */}
          <YStack space="$2">
            <Label
              htmlFor="business_email_address"
              fontSize={14}
              $sm={{ fontSize: 15 }}
              fontWeight="500"
            >
              Business Email
            </Label>
            <Input
              id="business_email_address"
              value={properties.business_email_address || ''}
              onChangeText={(text) => handleChange('business_email_address', text)}
              placeholder="contact@business.com"
              keyboardType="email-address"
              fontSize={14}
              $sm={{ fontSize: 15 }}
              $lg={{ fontSize: 16 }}
              size="$4"
              $sm={{ size: "$4.5" }}
            />
            {getFieldError('business_email_address') && (
              <Text fontSize={12} color="$red10">{getFieldError('business_email_address')}</Text>
            )}
          </YStack>

          {/* Phone */}
          <YStack space="$2">
            <XStack justifyContent="space-between" alignItems="center">
              <Label htmlFor="phone" fontSize={14} $sm={{ fontSize: 15 }} fontWeight="500">
                Phone Number
              </Label>
              <Badge variant="outline">
                <XStack space="$1" alignItems="center">
                  <Info size={12} />
                  <Text fontSize={11} $sm={{ fontSize: 12 }}>Directory Required</Text>
                </XStack>
              </Badge>
            </XStack>
            <Input
              id="phone"
              value={properties.phone || ''}
              onChangeText={(text) => handleChange('phone', text)}
              placeholder="555-123-4567"
              keyboardType="phone-pad"
              fontSize={14}
              $sm={{ fontSize: 15 }}
              $lg={{ fontSize: 16 }}
              size="$4"
              $sm={{ size: "$4.5" }}
            />
            {getFieldError('phone') && (
              <Text fontSize={12} color="$red10">{getFieldError('phone')}</Text>
            )}
            <Text fontSize={12} $sm={{ fontSize: 13 }} color="$color" opacity={0.6}>
              Will be formatted as XXX-XXX-XXXX for directory submission
            </Text>
          </YStack>

          {/* Website */}
          <YStack space="$2">
            <XStack justifyContent="space-between" alignItems="center">
              <Label htmlFor="website" fontSize={14} $sm={{ fontSize: 15 }} fontWeight="500">
                Website (Primary)
              </Label>
              <Badge variant="outline">
                <XStack space="$1" alignItems="center">
                  <Info size={12} />
                  <Text fontSize={11} $sm={{ fontSize: 12 }}>Directory Required</Text>
                </XStack>
              </Badge>
            </XStack>
            <Input
              id="website"
              value={properties.website || ''}
              onChangeText={(text) => handleChange('website', text)}
              placeholder="https://www.business.com"
              keyboardType="url"
              fontSize={14}
              $sm={{ fontSize: 15 }}
              $lg={{ fontSize: 16 }}
              size="$4"
              $sm={{ size: "$4.5" }}
            />
            {getFieldError('website') && (
              <Text fontSize={12} color="$red10">{getFieldError('website')}</Text>
            )}
          </YStack>

          {/* Current Website (Fallback) */}
          <YStack space="$2">
            <Label
              htmlFor="current_website"
              fontSize={14}
              $sm={{ fontSize: 15 }}
              fontWeight="500"
            >
              Website (Fallback)
            </Label>
            <Input
              id="current_website"
              value={properties.current_website || ''}
              onChangeText={(text) => handleChange('current_website', text)}
              placeholder="https://www.business.com"
              keyboardType="url"
              fontSize={14}
              $sm={{ fontSize: 15 }}
              $lg={{ fontSize: 16 }}
              size="$4"
              $sm={{ size: "$4.5" }}
            />
            {getFieldError('current_website') && (
              <Text fontSize={12} color="$red10">{getFieldError('current_website')}</Text>
            )}
            <Text fontSize={12} $sm={{ fontSize: 13 }} color="$color" opacity={0.6}>
              Used if primary website is invalid
            </Text>
          </YStack>
        </YStack>
      </Card>

      {/* Location Section */}
      <Card>
        <CardHeader
          icon={MapPin}
          title="Location"
          description="Physical address for local directory listings"
        />
        <Separator borderColor="$borderColor" />
        <YStack space="$4" $sm={{ space: "$4.5" }}>
          {/* Address */}
          <YStack space="$2">
            <XStack justifyContent="space-between" alignItems="center">
              <Label htmlFor="address" fontSize={14} $sm={{ fontSize: 15 }} fontWeight="500">
                Street Address
              </Label>
              <Badge variant="outline">
                <XStack space="$1" alignItems="center">
                  <Info size={12} />
                  <Text fontSize={11} $sm={{ fontSize: 12 }}>Directory Required</Text>
                </XStack>
              </Badge>
            </XStack>
            <Input
              id="address"
              value={properties.address || ''}
              onChangeText={(text) => handleChange('address', text)}
              placeholder="123 Main Street"
              fontSize={14}
              $sm={{ fontSize: 15 }}
              $lg={{ fontSize: 16 }}
              size="$4"
              $sm={{ size: "$4.5" }}
            />
          </YStack>

          {/* City, State, Zip Grid */}
          <XStack
            space="$3"
            $sm={{ space: "$4" }}
            flexWrap="wrap"
            $gtSm={{ flexWrap: "nowrap" }}
          >
            {/* City */}
            <YStack space="$2" flex={1} minWidth={120}>
              <XStack space="$1" alignItems="center">
                <Label htmlFor="city" fontSize={14} $sm={{ fontSize: 15 }} fontWeight="500">
                  City
                </Label>
                <Badge variant="outline">
                  <Text fontSize={10} $sm={{ fontSize: 11 }}>Required</Text>
                </Badge>
              </XStack>
              <Input
                id="city"
                value={properties.city || ''}
                onChangeText={(text) => handleChange('city', text)}
                placeholder="San Francisco"
                fontSize={14}
                $sm={{ fontSize: 15 }}
                $lg={{ fontSize: 16 }}
                size="$4"
                $sm={{ size: "$4.5" }}
              />
            </YStack>

            {/* State */}
            <YStack space="$2" flex={1} minWidth={100}>
              <XStack space="$1" alignItems="center">
                <Label htmlFor="state" fontSize={14} $sm={{ fontSize: 15 }} fontWeight="500">
                  State
                </Label>
                <Badge variant="outline">
                  <Text fontSize={10} $sm={{ fontSize: 11 }}>Required</Text>
                </Badge>
              </XStack>
              <Input
                id="state"
                value={properties.state || ''}
                onChangeText={(text) => handleChange('state', text)}
                placeholder="CA"
                fontSize={14}
                $sm={{ fontSize: 15 }}
                $lg={{ fontSize: 16 }}
                size="$4"
                $sm={{ size: "$4.5" }}
              />
            </YStack>

            {/* Zip */}
            <YStack space="$2" flex={1} minWidth={100}>
              <XStack space="$1" alignItems="center">
                <Label htmlFor="zip" fontSize={14} $sm={{ fontSize: 15 }} fontWeight="500">
                  Zip Code
                </Label>
                <Badge variant="outline">
                  <Text fontSize={10} $sm={{ fontSize: 11 }}>Required</Text>
                </Badge>
              </XStack>
              <Input
                id="zip"
                value={properties.zip || ''}
                onChangeText={(text) => handleChange('zip', text)}
                placeholder="94103"
                keyboardType="numeric"
                fontSize={14}
                $sm={{ fontSize: 15 }}
                $lg={{ fontSize: 16 }}
                size="$4"
                $sm={{ size: "$4.5" }}
              />
            </YStack>
          </XStack>

          {/* Country */}
          <YStack space="$2">
            <XStack justifyContent="space-between" alignItems="center">
              <Label htmlFor="country" fontSize={14} $sm={{ fontSize: 15 }} fontWeight="500">
                Country
              </Label>
              <Badge variant="outline">
                <XStack space="$1" alignItems="center">
                  <Info size={12} />
                  <Text fontSize={11} $sm={{ fontSize: 12 }}>Directory Required</Text>
                </XStack>
              </Badge>
            </XStack>
            <Select
              id="country"
              value={properties.country || 'USA'}
              onValueChange={(value) => handleChange('country', value)}
            >
              <Select.Trigger
                iconAfter={ChevronDown}
                fontSize={14}
                $sm={{ fontSize: 15 }}
                $lg={{ fontSize: 16 }}
              >
                <Select.Value placeholder="Select country" />
              </Select.Trigger>

              <Adapt when="sm" platform="touch">
                <Sheet modal dismissOnSnapToBottom>
                  <Sheet.Frame>
                    <Sheet.ScrollView>
                      <Adapt.Contents />
                    </Sheet.ScrollView>
                  </Sheet.Frame>
                  <Sheet.Overlay />
                </Sheet>
              </Adapt>

              <Select.Content zIndex={200000}>
                <Select.ScrollUpButton />
                <Select.Viewport>
                  <Select.Item index={0} value="USA">
                    <Select.ItemText>United States (USA)</Select.ItemText>
                  </Select.Item>
                  <Select.Item index={1} value="CAN">
                    <Select.ItemText>Canada (CAN)</Select.ItemText>
                  </Select.Item>
                  <Select.Item index={2} value="GBR">
                    <Select.ItemText>United Kingdom (GBR)</Select.ItemText>
                  </Select.Item>
                  <Select.Item index={3} value="AUS">
                    <Select.ItemText>Australia (AUS)</Select.ItemText>
                  </Select.Item>
                </Select.Viewport>
                <Select.ScrollDownButton />
              </Select.Content>
            </Select>
            <Text fontSize={12} $sm={{ fontSize: 13 }} color="$color" opacity={0.6}>
              39% of records blank - defaults to USA for directory submission
            </Text>
          </YStack>
        </YStack>
      </Card>

      {/* Social Media Section */}
      <Card>
        <CardHeader
          icon={Share2}
          title="Social Media"
          description="Social media profiles for enhanced directory listings"
        />
        <Separator borderColor="$borderColor" />
        <YStack space="$4" $sm={{ space: "$4.5" }}>
          {/* Twitter */}
          <YStack space="$2">
            <Label
              htmlFor="twitterhandle"
              fontSize={14}
              $sm={{ fontSize: 15 }}
              fontWeight="500"
            >
              Twitter/X Handle
            </Label>
            <Input
              id="twitterhandle"
              value={properties.twitterhandle || ''}
              onChangeText={(text) => handleChange('twitterhandle', text)}
              placeholder="@businessname or businessname"
              fontSize={14}
              $sm={{ fontSize: 15 }}
              $lg={{ fontSize: 16 }}
              size="$4"
              $sm={{ size: "$4.5" }}
            />
            <Text fontSize={12} $sm={{ fontSize: 13 }} color="$color" opacity={0.6}>
              Will be converted to https://twitter.com/handle for directory submission
            </Text>
          </YStack>

          {/* Facebook */}
          <YStack space="$2">
            <Label
              htmlFor="facebook_company_page"
              fontSize={14}
              $sm={{ fontSize: 15 }}
              fontWeight="500"
            >
              Facebook Page URL
            </Label>
            <Input
              id="facebook_company_page"
              value={properties.facebook_company_page || ''}
              onChangeText={(text) => handleChange('facebook_company_page', text)}
              placeholder="https://facebook.com/businessname"
              keyboardType="url"
              fontSize={14}
              $sm={{ fontSize: 15 }}
              $lg={{ fontSize: 16 }}
              size="$4"
              $sm={{ size: "$4.5" }}
            />
            {getFieldError('facebook_company_page') && (
              <Text fontSize={12} color="$red10">{getFieldError('facebook_company_page')}</Text>
            )}
          </YStack>

          {/* LinkedIn */}
          <YStack space="$2">
            <Label
              htmlFor="linkedin_company_page"
              fontSize={14}
              $sm={{ fontSize: 15 }}
              fontWeight="500"
            >
              LinkedIn Company URL
            </Label>
            <Input
              id="linkedin_company_page"
              value={properties.linkedin_company_page || ''}
              onChangeText={(text) => handleChange('linkedin_company_page', text)}
              placeholder="https://linkedin.com/company/businessname"
              keyboardType="url"
              fontSize={14}
              $sm={{ fontSize: 15 }}
              $lg={{ fontSize: 16 }}
              size="$4"
              $sm={{ size: "$4.5" }}
            />
            {getFieldError('linkedin_company_page') && (
              <Text fontSize={12} color="$red10">{getFieldError('linkedin_company_page')}</Text>
            )}
          </YStack>
        </YStack>
      </Card>

      {/* Directory Settings Section */}
      <Card>
        <CardHeader
          icon={Settings}
          title="Directory Settings"
          description="Settings for directory sync and submission"
        />
        <Separator borderColor="$borderColor" />
        <YStack space="$4" $sm={{ space: "$4.5" }}>
          {/* Active Customer Status */}
          <YStack space="$2">
            <XStack justifyContent="space-between" alignItems="center">
              <Label
                htmlFor="active_customer"
                fontSize={14}
                $sm={{ fontSize: 15 }}
                fontWeight="500"
              >
                Customer Status
              </Label>
              <Badge variant="outline">
                <XStack space="$1" alignItems="center">
                  <Info size={12} />
                  <Text fontSize={11} $sm={{ fontSize: 12 }}>Directory Required</Text>
                </XStack>
              </Badge>
            </XStack>
            <Select
              id="active_customer"
              value={properties.active_customer || 'No'}
              onValueChange={(value) => handleChange('active_customer', value)}
            >
              <Select.Trigger
                iconAfter={ChevronDown}
                fontSize={14}
                $sm={{ fontSize: 15 }}
                $lg={{ fontSize: 16 }}
              >
                <Select.Value placeholder="Select status" />
              </Select.Trigger>

              <Adapt when="sm" platform="touch">
                <Sheet modal dismissOnSnapToBottom>
                  <Sheet.Frame>
                    <Sheet.ScrollView>
                      <Adapt.Contents />
                    </Sheet.ScrollView>
                  </Sheet.Frame>
                  <Sheet.Overlay />
                </Sheet>
              </Adapt>

              <Select.Content zIndex={200000}>
                <Select.ScrollUpButton />
                <Select.Viewport>
                  <Select.Item index={0} value="Yes">
                    <Select.ItemText>Yes - Active Customer</Select.ItemText>
                  </Select.Item>
                  <Select.Item index={1} value="No">
                    <Select.ItemText>No - Inactive/Adhoc</Select.ItemText>
                  </Select.Item>
                </Select.Viewport>
                <Select.ScrollDownButton />
              </Select.Content>
            </Select>
            <Text fontSize={12} $sm={{ fontSize: 13 }} color="$color" opacity={0.6}>
              Maps to "active" (Yes) or "adhoc" (No) status for directory submission
            </Text>
          </YStack>

          {/* Business Hours */}
          <YStack space="$2">
            <Label
              htmlFor="business_hours"
              fontSize={14}
              $sm={{ fontSize: 15 }}
              fontWeight="500"
            >
              Business Hours
            </Label>
            <TextArea
              id="business_hours"
              value={properties.business_hours || ''}
              onChangeText={(text) => handleChange('business_hours', text)}
              placeholder="Mon-Fri: 9:00 AM - 5:00 PM&#10;Sat: 10:00 AM - 2:00 PM&#10;Sun: Closed"
              numberOfLines={4}
              fontSize={14}
              $sm={{ fontSize: 15 }}
              $lg={{ fontSize: 16 }}
            />
            <Text fontSize={12} $sm={{ fontSize: 13 }} color="$color" opacity={0.6}>
              95% of records empty - free text format (structured parsing not yet implemented)
            </Text>
          </YStack>

          {/* Payment Methods */}
          <YStack space="$2">
            <Label
              htmlFor="payment_methods_accepted"
              fontSize={14}
              $sm={{ fontSize: 15 }}
              fontWeight="500"
            >
              Payment Methods Accepted
            </Label>
            <TextArea
              id="payment_methods_accepted"
              value={properties.payment_methods_accepted || ''}
              onChangeText={(text) => handleChange('payment_methods_accepted', text)}
              placeholder="Cash, Visa, Mastercard, American Express, PayPal"
              numberOfLines={2}
              fontSize={14}
              $sm={{ fontSize: 15 }}
              $lg={{ fontSize: 16 }}
            />
            <Text fontSize={12} $sm={{ fontSize: 13 }} color="$color" opacity={0.6}>
              Free text - will be parsed for directory boolean fields (Cash, Visa, etc.)
            </Text>
          </YStack>
        </YStack>
      </Card>

      {/* Action Bar */}
      <YStack
        position="sticky"
        bottom={0}
        backgroundColor="$background"
        opacity={0.98}
        padding="$4"
        $sm={{ padding: "$5" }}
        borderTopWidth={1}
        borderColor="$borderColor"
        shadowColor="$shadowColor"
        shadowOffset={{ width: 0, height: -2 }}
        shadowOpacity={0.1}
        shadowRadius={8}
        borderRadius="$4"
      >
        <XStack
          maxWidth={896}
          alignSelf="center"
          width="100%"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap="$3"
        >
          {/* Status Badges */}
          <XStack space="$2" alignItems="center" flexWrap="wrap">
            {isDirty && (
              <Badge variant="warning">
                <XStack space="$1.5" alignItems="center">
                  <AlertCircle size={14} />
                  <Text>Unsaved changes</Text>
                </XStack>
              </Badge>
            )}
            {saveStatus === 'success' && (
              <Badge variant="success">
                <XStack space="$1.5" alignItems="center">
                  <CheckCircle2 size={14} />
                  <Text>Saved successfully</Text>
                </XStack>
              </Badge>
            )}
          </XStack>

          {/* Action Buttons */}
          <XStack space="$2" flexWrap="wrap">
            <Button
              variant="outlined"
              onPress={handleReset}
              disabled={!isDirty || isSaving}
              size="$4"
              $sm={{ size: "$4.5" }}
              icon={RotateCcw}
            >
              Reset
            </Button>

            <Button
              variant="outlined"
              onPress={onCancel}
              disabled={isSaving}
              size="$4"
              $sm={{ size: "$4.5" }}
              icon={X}
            >
              Cancel
            </Button>

            <Button
              onPress={handleSave}
              disabled={!isDirty || isSaving || validationErrors.length > 0}
              size="$4"
              $sm={{ size: "$4.5" }}
              icon={isSaving ? Loader2 : Save}
              iconAfter={isSaving ? undefined : undefined}
              backgroundColor="$zingBlue"
              pressStyle={{ opacity: 0.8 }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </XStack>
        </XStack>
      </YStack>

      {/* Confirmation Modal */}
      <Dialog modal open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <Dialog.Portal>
          <Dialog.Overlay
            key="overlay"
            animation="quick"
            opacity={0.5}
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
            backgroundColor="$backgroundStrong"
          />
          <Dialog.Content
            bordered
            elevate
            key="content"
            animateOnly={['transform', 'opacity']}
            animation={[
              'quick',
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
            enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
            exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
            gap="$4"
            maxWidth={500}
            padding="$6"
            backgroundColor="$background"
            borderRadius="$6"
            borderWidth={1}
            borderColor="$borderColor"
          >
            <YStack space="$4">
              {/* Warning Icon & Title */}
              <XStack space="$3" alignItems="center">
                <YStack
                  backgroundColor="rgba(255, 122, 89, 0.1)"
                  padding="$2"
                  borderRadius="$3"
                >
                  <AlertTriangle size={24} color="#FF7A59" strokeWidth={2} />
                </YStack>
                <Dialog.Title fontSize="$7" fontWeight="700" color="$color">
                  Confirm HubSpot Update
                </Dialog.Title>
              </XStack>

              {/* Warning Message */}
              <YStack space="$2">
                <Text fontSize="$4" color="$color" opacity={0.8} lineHeight="$5">
                  This action will update the contact data in <Text fontWeight="700" color="#FF7A59">HubSpot</Text> (your source of truth).
                </Text>
                <Text fontSize="$4" color="$color" opacity={0.8} lineHeight="$5">
                  Changes will be automatically synced to the local cache.
                </Text>
              </YStack>

              {/* Changed Properties Display */}
              <YStack
                space="$2"
                padding="$3"
                backgroundColor="rgba(168, 85, 247, 0.05)"
                borderRadius="$3"
                borderWidth={1}
                borderColor="rgba(168, 85, 247, 0.2)"
                maxHeight={200}
                overflow="scroll"
              >
                <Text fontSize="$3" fontWeight="700" color="$color" opacity={0.7} textTransform="uppercase">
                  Properties Being Updated:
                </Text>
                {Object.entries(properties).filter(([key, value]) => {
                  const initialValue = initialProperties[key as keyof EditableCompanyProperties];
                  return value !== initialValue;
                }).map(([key, value]) => (
                  <XStack key={key} space="$2" alignItems="flex-start">
                    <Text fontSize="$3" color="$color" opacity={0.6} minWidth={120}>
                      {key}:
                    </Text>
                    <YStack flex={1}>
                      <Text fontSize="$3" color="#EF4444" opacity={0.7} textDecorationLine="line-through">
                        {initialProperties[key as keyof EditableCompanyProperties] || '(empty)'}
                      </Text>
                      <Text fontSize="$3" color="#10B981" fontWeight="600">
                        {value || '(empty)'}
                      </Text>
                    </YStack>
                  </XStack>
                ))}
              </YStack>

              {/* Info Box - Single Source of Truth */}
              <XStack
                space="$2"
                padding="$3"
                backgroundColor="rgba(59, 130, 246, 0.1)"
                borderRadius="$3"
                borderWidth={1}
                borderColor="rgba(59, 130, 246, 0.2)"
              >
                <Info size={16} color="#3B82F6" strokeWidth={2} style={{ marginTop: 2 }} />
                <Text fontSize="$3" color="$color" opacity={0.9} lineHeight="$4" flex={1}>
                  <Text fontWeight="700">Single Source of Truth:</Text> HubSpot is the primary data store. Changes sync automatically to keep your local view up-to-date.
                </Text>
              </XStack>

              {/* Action Buttons */}
              <XStack space="$3" justifyContent="flex-end" marginTop="$2">
                <Dialog.Close asChild>
                  <Button
                    size="$4"
                    backgroundColor="$background"
                    borderWidth={1}
                    borderColor="$borderColor"
                    pressStyle={{ opacity: 0.8 }}
                  >
                    Cancel
                  </Button>
                </Dialog.Close>

                <Button
                  size="$4"
                  backgroundColor="#FF7A59"
                  onPress={confirmAndSave}
                  pressStyle={{ opacity: 0.8 }}
                >
                  <Text color="white" fontWeight="600">
                    Yes, Update HubSpot
                  </Text>
                </Button>
              </XStack>
            </YStack>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </YStack>
  );
}

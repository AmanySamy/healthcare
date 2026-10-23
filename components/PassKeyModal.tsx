"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  checkAdminSession,
  verifyAdminPasskey,
} from "@/lib/actions/admin.actions";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Image from "next/image";
const PassKeyModal = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const [passkey, setPasskey] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const closeModal = () => {
    setIsOpen(false);
    router.push("/");
  };

  useEffect(() => {
    let active = true;
    window.localStorage.removeItem("accessKey");
    checkAdminSession()
      .then((authorized) => {
        if (active && authorized) {
          setIsOpen(false);
          router.push("/admin");
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [router]);

  const validatePasskey = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      if (await verifyAdminPasskey(passkey)) {
        setIsOpen(false);
        router.push("/admin");
        router.refresh();
      } else {
        setError(
          "Unable to verify access. Check the passkey or try again later.",
        );
      }
    } catch {
      setError("Unable to verify access. Please try again later.");
    } finally {
      setPasskey("");
      setIsLoading(false);
    }
  };
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="shad-alert-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-start justify-between">
            Admin Access Verification
            <Image
              src="/assets/icons/close.svg"
              alt="Close"
              width={20}
              height={20}
              className="cursor-pointer"
              onClick={() => closeModal()}
            />
          </AlertDialogTitle>
          <AlertDialogDescription>
            To access the admin page, please enter the passkey.....
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div>
          <InputOTP
            maxLength={6}
            value={passkey}
            onChange={(value) => setPasskey(value)}
          >
            <InputOTPGroup className="shad-otp">
              <InputOTPSlot className="shad-otp-slot" index={0} />
              <InputOTPSlot className="shad-otp-slot" index={1} />
              <InputOTPSlot className="shad-otp-slot" index={2} />
              <InputOTPSlot className="shad-otp-slot" index={3} />
              <InputOTPSlot className="shad-otp-slot" index={4} />
              <InputOTPSlot className="shad-otp-slot" index={5} />
            </InputOTPGroup>
          </InputOTP>
          {error && (
            <p className="shad-error text-14-regular mt-4 flex justify-center">
              {error}
            </p>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogAction
            className="shad-primary-btn w-full"
            disabled={isLoading || passkey.length !== 6}
            onClick={validatePasskey}
          >
            Enter admin panel
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PassKeyModal;

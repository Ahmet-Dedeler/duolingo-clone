import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { LOCAL_USER } from "@/lib/local-user";

import { SidebarItem } from "./sidebar-item";

type SidebarProps = {
  className?: string;
};

export const Sidebar = ({ className }: SidebarProps) => {
  return (
    <div
      className={cn(
        "left-0 top-0 flex h-full flex-col border-r-2 px-4 lg:fixed lg:w-[256px]",
        className
      )}
    >
      <Link href="/learn">
        <div className="flex items-center gap-x-3 pb-7 pl-4 pt-8">
          <Image src="/mascot.svg" alt="Mascot" height={40} width={40} />

          <h1 className="text-2xl font-extrabold tracking-wide text-green-600">
            Lingo
          </h1>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-y-2">
        <SidebarItem label="Learn" href="/learn" iconSrc="/learn.svg" />
        <SidebarItem
          label="Leaderboard"
          href="/leaderboard"
          iconSrc="/leaderboard.svg"
        />
        <SidebarItem label="Quests" href="/quests" iconSrc="/quests.svg" />
        <SidebarItem label="Shop" href="/shop" iconSrc="/shop.svg" />
        <SidebarItem label="Admin" href="/admin" iconSrc="/quests.svg" />
      </div>

      <div className="flex items-center gap-x-3 p-4">
        <Image
          src={LOCAL_USER.imageSrc}
          alt={LOCAL_USER.name}
          height={32}
          width={32}
          className="rounded-full"
        />
        <span className="font-semibold text-neutral-700">{LOCAL_USER.name}</span>
      </div>
    </div>
  );
};
